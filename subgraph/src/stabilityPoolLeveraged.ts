/**
 * Stability Pool Leveraged (Sail) event handlers for Harbor Marks tracking
 * Note: Leveraged pool deposits may have different multipliers
 */

import {
  Deposit as StabilityPoolDepositEvent,
  Withdraw as StabilityPoolWithdrawEvent,
  UserDepositChange as UserDepositChangeEvent,
} from "../generated/StabilityPoolLeveraged/StabilityPool";
import {
  StabilityPoolDeposit,
  MarksMultiplier,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { StabilityPool } from "../generated/StabilityPoolLeveraged_ETH_fxUSD/StabilityPool";
import { Minter } from "../generated/StabilityPoolLeveraged_ETH_fxUSD/Minter";
import { ChainlinkAggregator } from "../generated/StabilityPoolLeveraged_ETH_fxUSD/ChainlinkAggregator";
import {
  ANCHOR_BOOST_MULTIPLIER,
  getActiveBoostMultiplier,
  getOrCreateMarketBoostWindow,
} from "./marksBoost";
import { ensureUserRegistered } from "./userRegistry";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0"); // Could be higher for leveraged pool
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const POOL_TYPE = "sail";
const E18 = BigDecimal.fromString("1000000000000000000"); // 10^18

// Chainlink (mainnet) feeds
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

// Production v1 Sail tokens (mainnet)
const HS_FXUSD_ETH = Address.fromString("0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C"); // hsFXUSD-ETH
const HS_FXUSD_BTC = Address.fromString("0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B"); // hsFXUSD-BTC
const HS_STETH_BTC = Address.fromString("0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD"); // hsSTETH-BTC

// Production v1 minters (mainnet)
const MINTER_ETH_FXUSD = Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F");
const MINTER_BTC_FXUSD = Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888");
const MINTER_BTC_STETH = Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919");

function chainlinkUsd(feed: Address): BigDecimal {
  const oracle = ChainlinkAggregator.bind(feed);
  const res = oracle.try_latestAnswer();
  if (res.reverted) return BigDecimal.fromString("0");
  // standard Chainlink 8 decimals
  return res.value.toBigDecimal().div(BigDecimal.fromString("100000000"));
}

function pegUsdForSailToken(token: Address): BigDecimal {
  if (token.equals(HS_FXUSD_ETH)) return chainlinkUsd(ETH_USD_FEED);
  if (token.equals(HS_FXUSD_BTC) || token.equals(HS_STETH_BTC)) return chainlinkUsd(BTC_USD_FEED);
  return BigDecimal.fromString("1.0");
}

function minterForSailToken(token: Address): Address {
  if (token.equals(HS_FXUSD_ETH)) return MINTER_ETH_FXUSD;
  if (token.equals(HS_FXUSD_BTC)) return MINTER_BTC_FXUSD;
  if (token.equals(HS_STETH_BTC)) return MINTER_BTC_STETH;
  return Address.zero();
}

function sailTokenPriceUSD(token: Address): BigDecimal {
  const minterAddr = minterForSailToken(token);
  if (minterAddr.equals(Address.zero())) return BigDecimal.fromString("0");
  const minter = Minter.bind(minterAddr);
  const nav = minter.try_leveragedTokenPrice();
  if (nav.reverted) return BigDecimal.fromString("0");
  const priceInPeg = nav.value.toBigDecimal().div(E18);
  const pegUsd = pegUsdForSailToken(token);
  return priceInPeg.times(pegUsd);
}

function getPoolAssetToken(poolAddress: Address): Address | null {
  const pool = StabilityPool.bind(poolAddress);
  const res = pool.try_ASSET_TOKEN();
  if (res.reverted) return null;
  return res.value;
}

// Helper to get or create stability pool deposit
function getOrCreateStabilityPoolDeposit(
  poolAddress: Bytes,
  userAddress: Bytes
): StabilityPoolDeposit {
  const id = poolAddress.toHexString().concat("-").concat(userAddress.toHexString());
  let deposit = StabilityPoolDeposit.load(id);
  
  if (deposit == null) {
    deposit = new StabilityPoolDeposit(id);
    deposit.poolAddress = poolAddress;
    deposit.user = userAddress;
    deposit.balance = BigInt.fromI32(0);
    deposit.balanceUSD = BigDecimal.fromString("0");
    deposit.marksPerDay = BigDecimal.fromString("0");
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.totalMarksEarned = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
    deposit.lastUpdated = BigInt.fromI32(0);
    deposit.poolType = POOL_TYPE;
    deposit.marketId = null;
    deposit.save();
  }
  
  return deposit;
}

// Helper to query actual deposit balance from pool contract
function queryPoolDepositBalance(poolAddress: Address, userAddress: Address): BigInt {
  const pool = StabilityPool.bind(poolAddress);
  const balanceResult = pool.try_assetBalanceOf(userAddress);
  
  if (balanceResult.reverted) {
    return BigInt.fromI32(0);
  }
  
  return balanceResult.value;
}

// Accumulate marks based on time held (continuous accumulation)
function accumulateMarks(
  deposit: StabilityPoolDeposit,
  block: ethereum.Block
): void {
  const currentTimestamp = block.timestamp;
  
  if (deposit.balance.equals(BigInt.fromI32(0))) {
    deposit.marksPerDay = BigDecimal.fromString("0");
    deposit.lastUpdated = currentTimestamp;
    deposit.save();
    return;
  }

  const boost = getActiveBoostMultiplier(
    "stabilityPoolLeveraged",
    deposit.poolAddress,
    currentTimestamp
  );
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY
    .times(DEFAULT_MULTIPLIER)
    .times(boost);

  const lastUpdate = deposit.lastUpdated.gt(BigInt.fromI32(0))
    ? deposit.lastUpdated
    : deposit.firstDepositAt;

  if (lastUpdate.equals(BigInt.fromI32(0))) {
    deposit.firstDepositAt = currentTimestamp;
    deposit.lastUpdated = currentTimestamp;
    deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.save();
    return;
  }

  // Calculate time since last update (continuous accumulation)
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const daysSinceLastUpdate = timeSinceLastUpdate.toBigDecimal().div(SECONDS_PER_DAY);

    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      const marksAccumulated = deposit.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      deposit.accumulatedMarks = deposit.accumulatedMarks.plus(marksAccumulated);
      deposit.totalMarksEarned = deposit.totalMarksEarned.plus(marksAccumulated);
    }
  }
  
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  deposit.lastUpdated = currentTimestamp;
  deposit.save();
}

// Handler for Deposit event
export function handleStabilityPoolDeposit(event: StabilityPoolDepositEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.receiver;
  const timestamp = event.block.timestamp;

  getOrCreateMarketBoostWindow(
    "stabilityPoolLeveraged",
    poolAddress,
    timestamp,
    ANCHOR_BOOST_MULTIPLIER
  );
  
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  ensureUserRegistered(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  // Calculate USD value using real-time Minter price for sail tokens
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? sailTokenPriceUSD(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  
  // Update marks per day
  const boost = getActiveBoostMultiplier("stabilityPoolLeveraged", poolAddress, timestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY
    .times(DEFAULT_MULTIPLIER)
    .times(boost);
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  
  // Set first deposit time if needed
  if (deposit.firstDepositAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
    deposit.firstDepositAt = timestamp;
  }
  
  deposit.lastUpdated = timestamp;
  deposit.save();
}

// Handler for Withdraw event
export function handleStabilityPoolWithdraw(event: StabilityPoolWithdrawEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.owner;
  const timestamp = event.block.timestamp;

  getOrCreateMarketBoostWindow(
    "stabilityPoolLeveraged",
    poolAddress,
    timestamp,
    ANCHOR_BOOST_MULTIPLIER
  );
  
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  ensureUserRegistered(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? sailTokenPriceUSD(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  const boost = getActiveBoostMultiplier("stabilityPoolLeveraged", poolAddress, timestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY
    .times(DEFAULT_MULTIPLIER)
    .times(boost);
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  
  // Reset if balance is zero
  if (actualBalance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.lastUpdated = timestamp;
  deposit.save();
}

// Handler for UserDepositChange event (triggered by internal balance changes like liquidations)
export function handleStabilityPoolDepositChange(event: UserDepositChangeEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.owner;
  const newDeposit = event.params.newDeposit;
  const timestamp = event.block.timestamp;

  getOrCreateMarketBoostWindow(
    "stabilityPoolLeveraged",
    poolAddress,
    timestamp,
    ANCHOR_BOOST_MULTIPLIER
  );
  
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  ensureUserRegistered(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Update balance directly from event
  deposit.balance = newDeposit;
  
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = newDeposit.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? sailTokenPriceUSD(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  const boost = getActiveBoostMultiplier("stabilityPoolLeveraged", poolAddress, timestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY
    .times(DEFAULT_MULTIPLIER)
    .times(boost);
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  
  // Reset if balance is zero
  if (newDeposit.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.lastUpdated = timestamp;
  deposit.save();
}
