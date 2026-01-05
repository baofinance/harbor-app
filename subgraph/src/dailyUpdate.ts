import { Address, BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { HaTokenBalance, MarksMultiplier, PriceFeed, SailTokenBalance, StabilityPoolDeposit, UserList } from "../generated/schema";
import { fetchPriceUSD, getOrCreatePriceFeed } from "./priceOracle";
import { getActiveBoostMultiplier } from "./marksBoost";

const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const ONE_E18 = BigDecimal.fromString("1000000000000000000");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");

// Use PriceFeed as a lightweight singleton store (same pattern as existing code).
const LAST_DAILY_UPDATE_KEY = "lastDailyPriceUpdate";
const ONE_DAY = BigInt.fromI32(86400);

// Production v1 tokens (mainnet)
const HAETH = Address.fromString("0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5");
const HABTC = Address.fromString("0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7");
const HS_FXUSD_ETH = Address.fromString("0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C");
const HS_FXUSD_BTC = Address.fromString("0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B");
const HS_STETH_BTC = Address.fromString("0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD");

// Production v1 pools (mainnet) and their ASSET_TOKENs.
// Collateral pools use ha tokens; leveraged pools use hs tokens.
const POOL_COLL_ETH_FXUSD = Address.fromString("0x1F985CF7C10A81DE1940da581208D2855D263D72");
const POOL_LEV_ETH_FXUSD = Address.fromString("0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06");
const POOL_COLL_BTC_FXUSD = Address.fromString("0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49");
const POOL_LEV_BTC_FXUSD = Address.fromString("0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40");
const POOL_COLL_BTC_STETH = Address.fromString("0x667Ceb303193996697A5938cD6e17255EeAcef51");
const POOL_LEV_BTC_STETH = Address.fromString("0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013");

function getOrCreateDailyTracker(): PriceFeed {
  let tracker = PriceFeed.load(LAST_DAILY_UPDATE_KEY);
  if (tracker == null) {
    tracker = new PriceFeed(LAST_DAILY_UPDATE_KEY);
    tracker.tokenAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    tracker.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    tracker.priceUSD = BigDecimal.fromString("0");
    tracker.decimals = 18;
    tracker.lastUpdated = BigInt.fromI32(0);
    tracker.save();
  }
  return tracker;
}

function getOrCreateMarksMultiplier(sourceType: string, sourceAddress: Bytes, defaultMultiplier: BigDecimal, ts: BigInt): BigDecimal {
  const id = `${sourceType}-${sourceAddress.toHexString()}`;
  let mm = MarksMultiplier.load(id);
  if (mm == null) {
    mm = new MarksMultiplier(id);
    mm.sourceType = sourceType;
    mm.sourceAddress = sourceAddress;
    mm.multiplier = defaultMultiplier;
    mm.effectiveFrom = ts;
    mm.updatedAt = ts;
    mm.updatedBy = null;
    mm.save();
  }
  return mm.multiplier;
}

function accrueContinuous(
  lastUpdated: BigInt,
  now: BigInt,
  balanceUSD: BigDecimal,
  marksPerDollarPerDay: BigDecimal
): BigDecimal {
  if (lastUpdated.equals(BigInt.fromI32(0)) || !now.gt(lastUpdated)) return BigDecimal.fromString("0");
  const days = now.minus(lastUpdated).toBigDecimal().div(SECONDS_PER_DAY);
  if (days.le(BigDecimal.fromString("0"))) return BigDecimal.fromString("0");
  return balanceUSD.times(marksPerDollarPerDay).times(days);
}

function updateHaTokenHolders(token: Address, ts: BigInt, block: ethereum.Block): void {
  const tokenBytes = token as Bytes;
  const list = UserList.load(tokenBytes.toHexString());
  if (list == null) return;

  const pf = getOrCreatePriceFeed(tokenBytes, ts);
  const priceUSD = pf.priceUSD;

  const base = getOrCreateMarksMultiplier("haToken", tokenBytes, BigDecimal.fromString("1.0"), ts);
  const boost = getActiveBoostMultiplier("haToken", tokenBytes, ts);
  const mpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(base.times(boost));

  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = `${tokenBytes.toHexString()}-${user.toHexString()}`;
    const bal = HaTokenBalance.load(id);
    if (bal == null) continue;
    if (bal.balance.equals(BigInt.fromI32(0))) {
      bal.lastUpdated = ts;
      bal.marksPerDay = BigDecimal.fromString("0");
      bal.balanceUSD = BigDecimal.fromString("0");
      bal.save();
      continue;
    }

    const last = bal.lastUpdated.gt(BigInt.fromI32(0)) ? bal.lastUpdated : bal.firstSeenAt;
    const earned = accrueContinuous(last, ts, bal.balanceUSD, mpd);
    if (earned.gt(BigDecimal.fromString("0"))) {
      bal.accumulatedMarks = bal.accumulatedMarks.plus(earned);
      bal.totalMarksEarned = bal.totalMarksEarned.plus(earned);
    }

    // New daily snapshot
    const amountTokens = bal.balance.toBigDecimal().div(ONE_E18);
    bal.balanceUSD = amountTokens.times(priceUSD);
    bal.marksPerDay = bal.balanceUSD.times(mpd);
    bal.lastUpdated = ts;
    bal.save();
  }
}

function updateSailTokenHolders(token: Address, ts: BigInt, block: ethereum.Block): void {
  const tokenBytes = token as Bytes;
  const list = UserList.load(tokenBytes.toHexString());
  if (list == null) return;

  const pf = getOrCreatePriceFeed(tokenBytes, ts);
  const priceUSD = pf.priceUSD;

  const base = getOrCreateMarksMultiplier("sailToken", tokenBytes, BigDecimal.fromString("5.0"), ts);
  const boost = getActiveBoostMultiplier("sailToken", tokenBytes, ts);
  const mpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(base.times(boost));

  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = `${tokenBytes.toHexString()}-${user.toHexString()}`;
    const bal = SailTokenBalance.load(id);
    if (bal == null) continue;
    if (bal.balance.equals(BigInt.fromI32(0))) {
      bal.lastUpdated = ts;
      bal.marksPerDay = BigDecimal.fromString("0");
      bal.balanceUSD = BigDecimal.fromString("0");
      bal.save();
      continue;
    }

    const last = bal.lastUpdated.gt(BigInt.fromI32(0)) ? bal.lastUpdated : bal.firstSeenAt;
    const earned = accrueContinuous(last, ts, bal.balanceUSD, mpd);
    if (earned.gt(BigDecimal.fromString("0"))) {
      bal.accumulatedMarks = bal.accumulatedMarks.plus(earned);
      bal.totalMarksEarned = bal.totalMarksEarned.plus(earned);
    }

    // New daily snapshot
    const amountTokens = bal.balance.toBigDecimal().div(ONE_E18);
    bal.balanceUSD = amountTokens.times(priceUSD);
    bal.marksPerDay = bal.balanceUSD.times(mpd);
    bal.lastUpdated = ts;
    bal.save();
  }
}

function poolAsset(pool: Address): Address | null {
  if (pool.equals(POOL_COLL_ETH_FXUSD)) return HAETH;
  if (pool.equals(POOL_COLL_BTC_FXUSD)) return HABTC;
  if (pool.equals(POOL_COLL_BTC_STETH)) return HABTC;
  if (pool.equals(POOL_LEV_ETH_FXUSD)) return HS_FXUSD_ETH;
  if (pool.equals(POOL_LEV_BTC_FXUSD)) return HS_FXUSD_BTC;
  if (pool.equals(POOL_LEV_BTC_STETH)) return HS_STETH_BTC;
  return null;
}

function poolSourceType(pool: Address): string {
  // match boosts created in mappings
  if (pool.equals(POOL_LEV_ETH_FXUSD) || pool.equals(POOL_LEV_BTC_FXUSD) || pool.equals(POOL_LEV_BTC_STETH)) {
    return "stabilityPoolLeveraged";
  }
  return "stabilityPoolCollateral";
}

function updatePoolDepositors(pool: Address, ts: BigInt): void {
  const poolBytes = pool as Bytes;
  const list = UserList.load(poolBytes.toHexString());
  if (list == null) return;

  const asset = poolAsset(pool);
  if (asset == null) return;
  const assetBytes = asset as Bytes;
  const assetPf = getOrCreatePriceFeed(assetBytes, ts);
  const assetPriceUSD = assetPf.priceUSD;

  const sourceType = poolSourceType(pool);
  const base = getOrCreateMarksMultiplier(sourceType, poolBytes, BigDecimal.fromString("1.0"), ts);
  const boost = getActiveBoostMultiplier(sourceType, poolBytes, ts);
  const mpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(base.times(boost));

  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = poolBytes.toHexString().concat("-").concat(user.toHexString());
    const dep = StabilityPoolDeposit.load(id);
    if (dep == null) continue;
    if (dep.balance.equals(BigInt.fromI32(0))) {
      dep.lastUpdated = ts;
      dep.marksPerDay = BigDecimal.fromString("0");
      dep.balanceUSD = BigDecimal.fromString("0");
      dep.save();
      continue;
    }

    const last = dep.lastUpdated.gt(BigInt.fromI32(0)) ? dep.lastUpdated : dep.firstDepositAt;
    const earned = accrueContinuous(last, ts, dep.balanceUSD, mpd);
    if (earned.gt(BigDecimal.fromString("0"))) {
      dep.accumulatedMarks = dep.accumulatedMarks.plus(earned);
      dep.totalMarksEarned = dep.totalMarksEarned.plus(earned);
    }

    const amountTokens = dep.balance.toBigDecimal().div(ONE_E18);
    dep.balanceUSD = amountTokens.times(assetPriceUSD);
    dep.marksPerDay = dep.balanceUSD.times(mpd);
    dep.lastUpdated = ts;
    dep.save();
  }
}

export function runDailyMarksUpdate(block: ethereum.Block): void {
  const tracker = getOrCreateDailyTracker();
  const ts = block.timestamp;
  if (ts.minus(tracker.lastUpdated).lt(ONE_DAY)) return;

  // Update daily prices for all tracked assets.
  // (This also ensures PriceFeed exists and has an updated priceUSD)
  const assets: Address[] = [HAETH, HABTC, HS_FXUSD_ETH, HS_FXUSD_BTC, HS_STETH_BTC];
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const b = a as Bytes;
    const pf = getOrCreatePriceFeed(b, ts);
    pf.priceUSD = fetchPriceUSD(b, ts);
    pf.lastUpdated = ts;
    pf.save();
  }

  // Roll marks forward + refresh snapshots for token holders.
  updateHaTokenHolders(HAETH, ts, block);
  updateHaTokenHolders(HABTC, ts, block);
  updateSailTokenHolders(HS_FXUSD_ETH, ts, block);
  updateSailTokenHolders(HS_FXUSD_BTC, ts, block);
  updateSailTokenHolders(HS_STETH_BTC, ts, block);

  // Pools (both collateral + leveraged)
  const pools: Address[] = [
    POOL_COLL_ETH_FXUSD,
    POOL_LEV_ETH_FXUSD,
    POOL_COLL_BTC_FXUSD,
    POOL_LEV_BTC_FXUSD,
    POOL_COLL_BTC_STETH,
    POOL_LEV_BTC_STETH,
  ];
  for (let i = 0; i < pools.length; i++) {
    updatePoolDepositors(pools[i], ts);
  }

  tracker.lastUpdated = ts;
  tracker.save();
}


