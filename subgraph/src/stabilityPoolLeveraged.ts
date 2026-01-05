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
  PriceFeed,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { StabilityPool } from "../generated/StabilityPoolLeveraged_ETH_fxUSD/StabilityPool";
import { fetchPriceUSD } from "./priceOracle";
import {
  ANCHOR_BOOST_MULTIPLIER,
  getActiveBoostMultiplier,
  getOrCreateMarketBoostWindow,
} from "./marksBoost";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0"); // Could be higher for leveraged pool
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const POOL_TYPE = "sail";
const E18 = BigDecimal.fromString("1000000000000000000"); // 10^18

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
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  // Calculate USD value using real-time Minter price for sail tokens
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? fetchPriceUSD(assetToken as Bytes, timestamp) : BigDecimal.fromString("0");
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
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? fetchPriceUSD(assetToken as Bytes, timestamp) : BigDecimal.fromString("0");
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
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Update balance directly from event
  deposit.balance = newDeposit;
  
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = newDeposit.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? fetchPriceUSD(assetToken as Bytes, timestamp) : BigDecimal.fromString("0");
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
