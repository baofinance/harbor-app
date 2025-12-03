/**
 * Stability Pool event handlers for Harbor Marks tracking
 * Handles deposits and withdrawals from stability pools (both collateral and sail)
 * Supports multiple markets with configurable multipliers
 */

import {
  Deposit as StabilityPoolDepositEvent,
  Withdraw as StabilityPoolWithdrawEvent,
  UserDepositChange as UserDepositChangeEvent,
} from "../generated/StabilityPoolCollateral/StabilityPool";
import {
  updateStabilityPoolMarksInTotal,
} from "./marksAggregation";
import {
  StabilityPoolDeposit,
  MarksMultiplier,
  UserTotalMarks,
  PriceFeed,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
// Config imports - using inline defaults for now to avoid compilation issues
// import {
//   getStabilityPoolMultiplier as getConfigMultiplier,
//   getPriceFeedAddress,
//   getPriceFeedDecimals,
// } from "./config";
import { StabilityPool } from "../generated/StabilityPoolCollateral/StabilityPool";
import { ERC20 } from "../generated/StabilityPoolCollateral/ERC20";
import { ChainlinkAggregator } from "../generated/StabilityPoolCollateral/ChainlinkAggregator";
// Note: We use StabilityPoolCollateral imports for both pools since they share the same ABI

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0"); // 1 mark per dollar per day
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");

// Simplified price feed - just return $1 for ha tokens (pegged tokens)
function getOrCreatePriceFeed(tokenAddress: Bytes, block: ethereum.Block): PriceFeed {
  const id = tokenAddress.toHexString();
  let priceFeed = PriceFeed.load(id);
  
  if (priceFeed == null) {
    priceFeed = new PriceFeed(id);
    priceFeed.tokenAddress = tokenAddress;
    priceFeed.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    priceFeed.priceUSD = BigDecimal.fromString("1.0"); // Default to $1 for ha tokens
    priceFeed.decimals = 8;
    priceFeed.lastUpdated = block.timestamp;
    priceFeed.save();
  }
  
  return priceFeed;
}

// Helper to determine pool type from address
// Maps known pool addresses to their types
function getPoolType(poolAddress: Bytes): string {
  const addressStr = poolAddress.toHexString();
  // Use simple string comparison - AssemblyScript handles this
  if (addressStr == "0x3aade2dcd2df6a8cac689ee797591b2913658659") {
    return "collateral";
  }
  if (addressStr == "0x525c7063e7c20997baae9bda922159152d0e8417") {
    return "sail";
  }
  return "collateral";
}

// Helper to get current multiplier for stability pool (from config file)
function getStabilityPoolMultiplier(
  poolAddress: Bytes,
  poolType: string,
  timestamp: BigInt
): BigDecimal {
  const sourceType = poolType === "collateral" ? "stabilityPoolCollateral" : "stabilityPoolSail";
  const id = `${sourceType}-${poolAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);
  
  // Get multiplier from config file (GitHub-controlled)
  // For now, using default - will load from config file later
  const configMultiplier = DEFAULT_MULTIPLIER;
  
  if (multiplier == null) {
    // Create new multiplier from config
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = sourceType;
    multiplier.sourceAddress = poolAddress;
    multiplier.multiplier = configMultiplier;
    multiplier.effectiveFrom = timestamp;
    multiplier.updatedAt = timestamp;
    multiplier.updatedBy = null;
    multiplier.save();
  } else {
    // Check if config has changed
    if (!multiplier.multiplier.equals(configMultiplier)) {
      // Config changed - create historical entry and update
      const historicalId = `${id}-${timestamp.toString()}`;
      const historical = new MarksMultiplier(historicalId);
      historical.sourceType = multiplier.sourceType;
      historical.sourceAddress = multiplier.sourceAddress;
      historical.multiplier = configMultiplier;
      historical.effectiveFrom = timestamp;
      historical.updatedAt = timestamp;
      historical.updatedBy = null; // Config file update (not on-chain)
      historical.save();
      
      // Update current multiplier
      multiplier.multiplier = configMultiplier;
      multiplier.updatedAt = timestamp;
      multiplier.save();
    }
  }
  
  return multiplier.multiplier;
}

// Helper to update multiplier (can be called by admin events in future)
export function updateStabilityPoolMultiplier(
  poolAddress: Bytes,
  poolType: string,
  newMultiplier: BigDecimal,
  timestamp: BigInt,
  updatedBy: Bytes | null
): void {
  const sourceType = poolType === "collateral" ? "stabilityPoolCollateral" : "stabilityPoolSail";
  const id = `${sourceType}-${poolAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);
  
  if (multiplier == null) {
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = sourceType;
    multiplier.sourceAddress = poolAddress;
    multiplier.effectiveFrom = timestamp;
  }
  
  // Create historical entry
  const historicalId = `${id}-${timestamp.toString()}`;
  const historical = new MarksMultiplier(historicalId);
  historical.sourceType = multiplier.sourceType;
  historical.sourceAddress = multiplier.sourceAddress;
  historical.multiplier = newMultiplier;
  historical.effectiveFrom = timestamp;
  historical.updatedAt = timestamp;
  historical.updatedBy = updatedBy;
  historical.save();
  
  // Update current multiplier
  multiplier.multiplier = newMultiplier;
  multiplier.updatedAt = timestamp;
  multiplier.updatedBy = updatedBy;
  multiplier.save();
}

// Helper to get or create stability pool deposit
function getOrCreateStabilityPoolDeposit(
  poolAddress: Bytes,
  userAddress: Bytes
): StabilityPoolDeposit {
  const id = `${poolAddress.toHexString()}-${userAddress.toHexString()}`;
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
    deposit.poolType = "collateral"; // Will be set on first deposit
    deposit.marketId = null;
    deposit.save();
  }
  
  return deposit;
}

// Helper to query pool's pegged token address
function getPeggedTokenAddress(poolAddress: Address): Bytes | null {
  // Try to query the pool contract for the asset token (pegged token)
  const pool = StabilityPool.bind(poolAddress);
  const assetResult = pool.try_asset();
  
  if (!assetResult.reverted) {
    return assetResult.value;
  }
  
  return null;
}

// Helper to calculate deposit value in USD (with price feed update)
function calculateDepositUSD(deposit: BigInt, peggedTokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  const priceFeed = getOrCreatePriceFeed(peggedTokenAddress, block);
  const depositDecimal = deposit.toBigDecimal().div(BigDecimal.fromString("1000000000000000000")); // 18 decimals
  return depositDecimal.times(priceFeed.priceUSD);
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

// Helper to accumulate marks for a deposit
function accumulateMarks(
  deposit: StabilityPoolDeposit,
  block: ethereum.Block
): void {
  const currentTimestamp = block.timestamp;
  if (deposit.balance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.marksPerDay = BigDecimal.fromString("0");
    deposit.lastUpdated = currentTimestamp;
    deposit.save();
    return;
  }
  
  // Get multiplier for this pool
  const multiplier = getStabilityPoolMultiplier(
    deposit.poolAddress,
    deposit.poolType,
    currentTimestamp
  );
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
  
  // Calculate time since last update
  const lastUpdate = deposit.lastUpdated.gt(BigInt.fromI32(0))
    ? deposit.lastUpdated
    : deposit.firstDepositAt;
  
  if (lastUpdate.equals(BigInt.fromI32(0))) {
    // First deposit
    deposit.firstDepositAt = currentTimestamp;
    deposit.lastUpdated = currentTimestamp;
    deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.save();
    return;
  }
  
  const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
  const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
  const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
  
  // Accumulate marks for the period
  const marksAccumulated = deposit.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
  deposit.accumulatedMarks = deposit.accumulatedMarks.plus(marksAccumulated);
  deposit.totalMarksEarned = deposit.totalMarksEarned.plus(marksAccumulated);
  
  // Update marks per day rate
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  deposit.lastUpdated = currentTimestamp;
  deposit.save();
}


// Handler for Deposit event
export function handleStabilityPoolDeposit(event: StabilityPoolDepositEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const timestamp = event.block.timestamp;
  
  const poolType = getPoolType(poolAddress);
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract (more accurate)
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.poolType = poolType;
  deposit.balance = actualBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(actualBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Set first deposit time if this is first deposit
  if (deposit.firstDepositAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
    deposit.firstDepositAt = timestamp;
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

// Handler for Withdraw event
export function handleStabilityPoolWithdraw(event: StabilityPoolWithdrawEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const timestamp = event.block.timestamp;
  
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(actualBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Reset if balance is zero
  if (actualBalance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

// Handler for UserDepositChange event (if available)
export function handleStabilityPoolDepositChange(event: UserDepositChangeEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const newBalance = event.params.newBalance;
  const timestamp = event.block.timestamp;
  
  const poolType = getPoolType(poolAddress);
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Update deposit
  deposit.poolType = poolType;
  deposit.balance = newBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(newBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Set first deposit time if this is first deposit
  if (deposit.firstDepositAt.equals(BigInt.fromI32(0)) && newBalance.gt(BigInt.fromI32(0))) {
    deposit.firstDepositAt = timestamp;
  }
  
  // Reset if balance is zero
  if (newBalance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

function accumulateMarks(
  deposit: StabilityPoolDeposit,
  block: ethereum.Block
): void {
  const currentTimestamp = block.timestamp;
  if (deposit.balance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.marksPerDay = BigDecimal.fromString("0");
    deposit.lastUpdated = currentTimestamp;
    deposit.save();
    return;
  }
  
  // Get multiplier for this pool
  const multiplier = getStabilityPoolMultiplier(
    deposit.poolAddress,
    deposit.poolType,
    currentTimestamp
  );
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
  
  // Calculate time since last update
  const lastUpdate = deposit.lastUpdated.gt(BigInt.fromI32(0))
    ? deposit.lastUpdated
    : deposit.firstDepositAt;
  
  if (lastUpdate.equals(BigInt.fromI32(0))) {
    // First deposit
    deposit.firstDepositAt = currentTimestamp;
    deposit.lastUpdated = currentTimestamp;
    deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.save();
    return;
  }
  
  const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
  const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
  const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
  
  // Accumulate marks for the period
  const marksAccumulated = deposit.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
  deposit.accumulatedMarks = deposit.accumulatedMarks.plus(marksAccumulated);
  deposit.totalMarksEarned = deposit.totalMarksEarned.plus(marksAccumulated);
  
  // Update marks per day rate
  deposit.marksPerDay = deposit.balanceUSD.times(marksPerDollarPerDay);
  deposit.lastUpdated = currentTimestamp;
  deposit.save();
}


// Handler for Deposit event
export function handleStabilityPoolDeposit(event: StabilityPoolDepositEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const timestamp = event.block.timestamp;
  
  const poolType = getPoolType(poolAddress);
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract (more accurate)
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.poolType = poolType;
  deposit.balance = actualBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(actualBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Set first deposit time if this is first deposit
  if (deposit.firstDepositAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
    deposit.firstDepositAt = timestamp;
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

// Handler for Withdraw event
export function handleStabilityPoolWithdraw(event: StabilityPoolWithdrawEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const timestamp = event.block.timestamp;
  
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Query actual balance from pool contract
  const actualBalance = queryPoolDepositBalance(Address.fromBytes(poolAddress), Address.fromBytes(userAddress));
  deposit.balance = actualBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(actualBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Reset if balance is zero
  if (actualBalance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

// Handler for UserDepositChange event (if available)
export function handleStabilityPoolDepositChange(event: UserDepositChangeEvent): void {
  const poolAddress = event.address;
  const userAddress = event.params.user;
  const newBalance = event.params.newBalance;
  const timestamp = event.block.timestamp;
  
  const poolType = getPoolType(poolAddress);
  const deposit = getOrCreateStabilityPoolDeposit(poolAddress, userAddress);
  
  // Accumulate marks before balance change
  accumulateMarks(deposit, event.block);
  
  // Update deposit
  deposit.poolType = poolType;
  deposit.balance = newBalance;
  
  // Get pegged token address from pool contract
  const peggedTokenAddress = getPeggedTokenAddress(Address.fromBytes(poolAddress));
  if (peggedTokenAddress != null) {
    deposit.balanceUSD = calculateDepositUSD(newBalance, peggedTokenAddress, event.block);
  } else {
    deposit.balanceUSD = BigDecimal.fromString("0");
  }
  
  // Set first deposit time if this is first deposit
  if (deposit.firstDepositAt.equals(BigInt.fromI32(0)) && newBalance.gt(BigInt.fromI32(0))) {
    deposit.firstDepositAt = timestamp;
  }
  
  // Reset if balance is zero
  if (newBalance.equals(BigInt.fromI32(0))) {
    deposit.accumulatedMarks = BigDecimal.fromString("0");
    deposit.firstDepositAt = BigInt.fromI32(0);
  }
  
  deposit.save();
  updateStabilityPoolMarksInTotal(userAddress, deposit, timestamp);
}

