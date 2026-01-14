import { Address, BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { ChainlinkAggregator } from "../generated/Minter_ETH_fxUSD/ChainlinkAggregator";
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";
import { HaTokenBalance, PriceFeed, SailTokenBalance, StabilityPoolDeposit, UserList } from "../generated/schema";
import { getActiveBoostMultiplier } from "./marksBoost";
import { accrueWithBoostWindow } from "./marksAccrual";

const ONE_DAY = BigInt.fromI32(86400);
const ONE_E18 = BigDecimal.fromString("1000000000000000000");
const SECONDS_PER_DAY_BD = BigDecimal.fromString("86400");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const SAIL_PROMO_MULTIPLIER = BigDecimal.fromString("2.0"); // hsTokens: additional 2x promo (stackable with boost)
// Promo starts at (new subgraph deploy time). This gate prevents backdating during reindex.
// Update this constant when you redeploy a new promo start.
const SAIL_PROMO_START_TIMESTAMP = BigInt.fromI32(1768355397);

// Singleton key (we reuse PriceFeed as a lightweight singleton store)
const LAST_DAILY_KEY = "lastDailyMarksUpdate";

// Chainlink feeds (mainnet, 8 decimals)
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

// Production v1 tokens/pools
const HAETH = Address.fromString("0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5");
const HABTC = Address.fromString("0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7");

const HS_FXUSD_ETH = Address.fromString("0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C");
const HS_FXUSD_BTC = Address.fromString("0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B");
const HS_STETH_BTC = Address.fromString("0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD");

const MINTER_ETH_FXUSD = Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F");
const MINTER_BTC_FXUSD = Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888");
const MINTER_BTC_STETH = Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919");

const POOL_COLL_ETH_FXUSD = Address.fromString("0x1F985CF7C10A81DE1940da581208D2855D263D72");
const POOL_LEV_ETH_FXUSD = Address.fromString("0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06");
const POOL_COLL_BTC_FXUSD = Address.fromString("0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49");
const POOL_LEV_BTC_FXUSD = Address.fromString("0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40");
const POOL_COLL_BTC_STETH = Address.fromString("0x667Ceb303193996697A5938cD6e17255EeAcef51");
const POOL_LEV_BTC_STETH = Address.fromString("0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013");

function getOrCreateTracker(): PriceFeed {
  let t = PriceFeed.load(LAST_DAILY_KEY);
  if (t == null) {
    t = new PriceFeed(LAST_DAILY_KEY);
    t.tokenAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    t.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    t.priceUSD = BigDecimal.fromString("0");
    t.decimals = 18;
    t.lastUpdated = BigInt.fromI32(0);
    t.save();
  }
  return t;
}

function chainlinkUsd(feed: Address): BigDecimal {
  const agg = ChainlinkAggregator.bind(feed);
  const ans = agg.try_latestAnswer();
  if (ans.reverted) return BigDecimal.fromString("0");
  return ans.value.toBigDecimal().div(BigDecimal.fromString("100000000"));
}

function pegUsdForHs(token: Address): BigDecimal {
  if (token.equals(HS_FXUSD_ETH)) return chainlinkUsd(ETH_USD_FEED);
  if (token.equals(HS_FXUSD_BTC) || token.equals(HS_STETH_BTC)) return chainlinkUsd(BTC_USD_FEED);
  return BigDecimal.fromString("1.0");
}

function minterForHs(token: Address): Address {
  if (token.equals(HS_FXUSD_ETH)) return MINTER_ETH_FXUSD;
  if (token.equals(HS_FXUSD_BTC)) return MINTER_BTC_FXUSD;
  if (token.equals(HS_STETH_BTC)) return MINTER_BTC_STETH;
  return Address.zero();
}

function hsPriceUsd(token: Address): BigDecimal {
  const m = minterForHs(token);
  if (m.equals(Address.zero())) return BigDecimal.fromString("0");
  const minter = Minter.bind(m);
  const nav = minter.try_leveragedTokenPrice();
  if (nav.reverted) return BigDecimal.fromString("0");
  const priceInPeg = nav.value.toBigDecimal().div(ONE_E18);
  return priceInPeg.times(pegUsdForHs(token));
}

function haPriceUsd(token: Address): BigDecimal {
  if (token.equals(HAETH)) return chainlinkUsd(ETH_USD_FEED);
  if (token.equals(HABTC)) return chainlinkUsd(BTC_USD_FEED);
  return BigDecimal.fromString("1.0");
}

function accrue(lastUpdated: BigInt, now: BigInt, balanceUSD: BigDecimal, baseMarksPerDollarPerDay: BigDecimal, sourceType: string, sourceAddress: Bytes): BigDecimal {
  return accrueWithBoostWindow(sourceType, sourceAddress, lastUpdated, now, balanceUSD, baseMarksPerDollarPerDay);
}

function updateHaBalances(token: Address, now: BigInt, priceUsd: BigDecimal): void {
  const list = UserList.load((token as Bytes).toHexString());
  if (list == null) return;
  const boost = getActiveBoostMultiplier("haToken", token as Bytes, now);
  const mpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(BigDecimal.fromString("1.0").times(boost));
  const baseMpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(BigDecimal.fromString("1.0"));
  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = (token as Bytes).toHexString().concat("-").concat(user.toHexString());
    const b = HaTokenBalance.load(id);
    if (b == null) continue;
    const last = b.lastUpdated.gt(BigInt.fromI32(0)) ? b.lastUpdated : b.firstSeenAt;
    const earned = accrue(last, now, b.balanceUSD, baseMpd, "haToken", token as Bytes);
    if (earned.gt(BigDecimal.fromString("0"))) {
      b.accumulatedMarks = b.accumulatedMarks.plus(earned);
      b.totalMarksEarned = b.totalMarksEarned.plus(earned);
    }
    const amount = b.balance.toBigDecimal().div(ONE_E18);
    b.balanceUSD = amount.times(priceUsd);
    b.marksPerDay = b.balanceUSD.times(mpd);
    b.lastUpdated = now;
    b.save();
  }
}

function updateHsBalances(token: Address, now: BigInt, priceUsd: BigDecimal): void {
  const list = UserList.load((token as Bytes).toHexString());
  if (list == null) return;
  const boost = getActiveBoostMultiplier("sailToken", token as Bytes, now);
  const promo = now.ge(SAIL_PROMO_START_TIMESTAMP) ? SAIL_PROMO_MULTIPLIER : BigDecimal.fromString("1.0");
  const baseMpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(BigDecimal.fromString("5.0").times(promo));
  const mpd = baseMpd.times(boost);
  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = (token as Bytes).toHexString().concat("-").concat(user.toHexString());
    const b = SailTokenBalance.load(id);
    if (b == null) continue;
    const last = b.lastUpdated.gt(BigInt.fromI32(0)) ? b.lastUpdated : b.firstSeenAt;
    const earned = accrue(last, now, b.balanceUSD, baseMpd, "sailToken", token as Bytes);
    if (earned.gt(BigDecimal.fromString("0"))) {
      b.accumulatedMarks = b.accumulatedMarks.plus(earned);
      b.totalMarksEarned = b.totalMarksEarned.plus(earned);
    }
    const amount = b.balance.toBigDecimal().div(ONE_E18);
    b.balanceUSD = amount.times(priceUsd);
    b.marksPerDay = b.balanceUSD.times(mpd);
    b.lastUpdated = now;
    b.save();
  }
}

function poolType(pool: Address): string {
  if (pool.equals(POOL_LEV_ETH_FXUSD) || pool.equals(POOL_LEV_BTC_FXUSD) || pool.equals(POOL_LEV_BTC_STETH)) return "stabilityPoolLeveraged";
  return "stabilityPoolCollateral";
}

function poolAssetUsd(
  pool: Address,
  haEthUsd: BigDecimal,
  haBtcUsd: BigDecimal,
  hsEthUsd: BigDecimal,
  hsBtcUsd: BigDecimal,
  hsStethUsd: BigDecimal
): BigDecimal {
  if (pool.equals(POOL_COLL_ETH_FXUSD)) return haEthUsd;
  if (pool.equals(POOL_COLL_BTC_FXUSD)) return haBtcUsd;
  if (pool.equals(POOL_COLL_BTC_STETH)) return haBtcUsd;
  // Leveraged pools deposit ha tokens (confirmed): treat as ha-valued deposits
  if (pool.equals(POOL_LEV_ETH_FXUSD)) return haEthUsd;
  if (pool.equals(POOL_LEV_BTC_FXUSD)) return haBtcUsd;
  if (pool.equals(POOL_LEV_BTC_STETH)) return haBtcUsd;
  return BigDecimal.fromString("0");
}

function updatePoolDeposits(pool: Address, now: BigInt, assetUsd: BigDecimal): void {
  const list = UserList.load((pool as Bytes).toHexString());
  if (list == null) return;
  const st = poolType(pool);
  const boost = getActiveBoostMultiplier(st, pool as Bytes, now);
  const mpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(BigDecimal.fromString("1.0").times(boost));
  const baseMpd = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(BigDecimal.fromString("1.0"));
  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const id = (pool as Bytes).toHexString().concat("-").concat(user.toHexString());
    const d = StabilityPoolDeposit.load(id);
    if (d == null) continue;
    const last = d.lastUpdated.gt(BigInt.fromI32(0)) ? d.lastUpdated : d.firstDepositAt;
    const earned = accrue(last, now, d.balanceUSD, baseMpd, st, pool as Bytes);
    if (earned.gt(BigDecimal.fromString("0"))) {
      d.accumulatedMarks = d.accumulatedMarks.plus(earned);
      d.totalMarksEarned = d.totalMarksEarned.plus(earned);
    }
    const amount = d.balance.toBigDecimal().div(ONE_E18);
    d.balanceUSD = amount.times(assetUsd);
    d.marksPerDay = d.balanceUSD.times(mpd);
    d.lastUpdated = now;
    d.save();
  }
}

export function runDailyMarksUpdate(block: ethereum.Block): void {
  const t = getOrCreateTracker();
  const now = block.timestamp;
  if (now.minus(t.lastUpdated).lt(ONE_DAY)) return;

  // Snapshot prices once per day.
  const haEthUsd = haPriceUsd(HAETH);
  const haBtcUsd = haPriceUsd(HABTC);
  const hsEthUsd = hsPriceUsd(HS_FXUSD_ETH);
  const hsBtcUsd = hsPriceUsd(HS_FXUSD_BTC);
  const hsStethUsd = hsPriceUsd(HS_STETH_BTC);

  // Roll user marks forward + refresh snapshots for the new price.
  updateHaBalances(HAETH, now, haEthUsd);
  updateHaBalances(HABTC, now, haBtcUsd);
  updateHsBalances(HS_FXUSD_ETH, now, hsEthUsd);
  updateHsBalances(HS_FXUSD_BTC, now, hsBtcUsd);
  updateHsBalances(HS_STETH_BTC, now, hsStethUsd);

  const pools: Address[] = [POOL_COLL_ETH_FXUSD, POOL_LEV_ETH_FXUSD, POOL_COLL_BTC_FXUSD, POOL_LEV_BTC_FXUSD, POOL_COLL_BTC_STETH, POOL_LEV_BTC_STETH];
  for (let i = 0; i < pools.length; i++) {
    const p = pools[i];
    const assetUsd = poolAssetUsd(p, haEthUsd, haBtcUsd, hsEthUsd, hsBtcUsd, hsStethUsd);
    if (assetUsd.gt(BigDecimal.fromString("0"))) updatePoolDeposits(p, now, assetUsd);
  }

  t.lastUpdated = now;
  t.save();
}


