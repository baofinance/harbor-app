/**
 * ha Token balance tracking for Harbor Marks
 * Tracks ERC20 Transfer events to calculate user balances and marks
 * Supports multiple ha tokens (markets) with configurable multipliers
 */

import {
  Transfer as TransferEvent,
} from "../generated/HaToken_haPB/ERC20";
import {
  updateHaTokenMarksInTotal,
} from "./marksAggregation";
import {
  HaTokenBalance,
  MarksMultiplier,
  UserTotalMarks,
  PriceFeed,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { ERC20 } from "../generated/HaToken_haPB/ERC20";
import { ChainlinkAggregator } from "../generated/HaToken_haPB/ChainlinkAggregator";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");

// Helper to get or create ha token balance
function getOrCreateHaTokenBalance(
  tokenAddress: Bytes,
  userAddress: Bytes
): HaTokenBalance {
  const id = `${tokenAddress.toHexString()}-${userAddress.toHexString()}`;
  let balance = HaTokenBalance.load(id);
  
  if (balance == null) {
    balance = new HaTokenBalance(id);
    balance.tokenAddress = tokenAddress;
    balance.user = userAddress;
    balance.balance = BigInt.fromI32(0);
    balance.balanceUSD = BigDecimal.fromString("0");
    balance.marksPerDay = BigDecimal.fromString("0");
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.totalMarksEarned = BigDecimal.fromString("0");
    balance.firstSeenAt = BigInt.fromI32(0);
    balance.lastUpdated = BigInt.fromI32(0);
    balance.marketId = null;
    balance.save();
  }
  
  return balance;
}

// Simplified price feed - just return $1 for now
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

// Simplified USD calculation
function calculateBalanceUSD(balance: BigInt, tokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  const priceFeed = getOrCreatePriceFeed(tokenAddress, block);
  const balanceDecimal = balance.toBigDecimal().div(BigDecimal.fromString("1000000000000000000")); // 18 decimals
  return balanceDecimal.times(priceFeed.priceUSD);
}

// Query contract balance directly
function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);
  const balanceResult = token.try_balanceOf(userAddress);
  
  if (balanceResult.reverted) {
    return BigInt.fromI32(0);
  }
  
  return balanceResult.value;
}

// Get multiplier (simplified)
function getHaTokenMultiplier(tokenAddress: Bytes, timestamp: BigInt): BigDecimal {
  const id = `haToken-${tokenAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);
  
  if (multiplier == null) {
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = "haToken";
    multiplier.sourceAddress = tokenAddress;
    multiplier.multiplier = DEFAULT_MULTIPLIER;
    multiplier.effectiveFrom = timestamp;
    multiplier.updatedAt = timestamp;
    multiplier.updatedBy = null;
    multiplier.save();
  }
  
  return multiplier.multiplier;
}

// Accumulate marks (simplified - no complex time calculations for now)
function accumulateMarks(
  balance: HaTokenBalance,
  block: ethereum.Block
): void {
  const currentTimestamp = block.timestamp;
  
  if (balance.balance.equals(BigInt.fromI32(0))) {
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.marksPerDay = BigDecimal.fromString("0");
    balance.lastUpdated = currentTimestamp;
    balance.save();
    return;
  }
  
  // Get multiplier
  const multiplier = getHaTokenMultiplier(balance.tokenAddress, currentTimestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
  
  // Calculate time since last update
  const lastUpdate = balance.lastUpdated.gt(BigInt.fromI32(0)) 
    ? balance.lastUpdated 
    : balance.firstSeenAt;
  
  if (lastUpdate.equals(BigInt.fromI32(0))) {
    // First time seeing this balance
    balance.firstSeenAt = currentTimestamp;
    balance.lastUpdated = currentTimestamp;
    balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.save();
    return;
  }
  
  // Calculate time since last update (continuous accumulation)
  // Marks are awarded for all time held, including partial days
  // Frontend will estimate marks between graph updates
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    // Only count full days (snapshot approach - like polling once per day)
    // This means if someone holds tokens for 1.5 days, they get marks for 1 full day
    // Count all time (including partial days)
    // If someone holds tokens for 2 hours, they get marks for 2/24 of a day
    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      // Use the balance USD from the last snapshot (the balance held during this time)
      const marksAccumulated = balance.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      balance.accumulatedMarks = balance.accumulatedMarks.plus(marksAccumulated);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(marksAccumulated);
      
      // Update lastUpdated to current timestamp (continuous tracking)
      balance.lastUpdated = currentTimestamp;
    }
  }
  
  // Update marks per day rate based on current balance
  balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
  balance.save();
}

// Main handler - Simplified daily snapshot approach
// On each transfer, we:
// 1. Accumulate marks for full days since last update (daily snapshot)
// 2. Update the balance snapshot
// 3. Reset the snapshot timer
export function handleHaTokenTransfer(event: TransferEvent): void {
  const tokenAddress = event.address;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;
  
  // Skip zero address transfers
  const zeroAddress = Address.fromString("0x0000000000000000000000000000000000000000");
  
  // Update sender balance (if not zero address)
  if (!from.equals(zeroAddress)) {
    const fromBalance = getOrCreateHaTokenBalance(tokenAddress, from);
    
    // Accumulate marks for full days since last snapshot
    accumulateMarks(fromBalance, event.block);
    
    // Query actual balance from contract (daily snapshot value)
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(from);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    // Update balance snapshot
    fromBalance.balance = actualBalance;
    fromBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    // Reset if balance goes to zero
    if (actualBalance.equals(BigInt.fromI32(0))) {
      fromBalance.accumulatedMarks = BigDecimal.fromString("0");
      fromBalance.firstSeenAt = BigInt.fromI32(0);
      fromBalance.lastUpdated = timestamp; // Reset snapshot time
    }
    // Note: lastUpdated is already updated in accumulateMarks() to the start of current day
    
    fromBalance.save();
    updateHaTokenMarksInTotal(from, fromBalance, timestamp);
  }
  
  // Update receiver balance (if not zero address)
  if (!to.equals(zeroAddress)) {
    const toBalance = getOrCreateHaTokenBalance(tokenAddress, to);
    
    // Accumulate marks for full days since last snapshot
    accumulateMarks(toBalance, event.block);
    
    // Query actual balance from contract (daily snapshot value)
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(to);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    // Update balance snapshot
    toBalance.balance = actualBalance;
    toBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    // Set first seen if this is first time having balance
    if (toBalance.firstSeenAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
      toBalance.firstSeenAt = timestamp;
      toBalance.lastUpdated = timestamp; // Initialize snapshot time
    }
    // Note: lastUpdated is already updated in accumulateMarks() to the start of current day
    
    toBalance.save();
    updateHaTokenMarksInTotal(to, toBalance, timestamp);
  }
}

 * Tracks ERC20 Transfer events to calculate user balances and marks
 * Supports multiple ha tokens (markets) with configurable multipliers
 */

import {
  Transfer as TransferEvent,
} from "../generated/HaToken_haPB/ERC20";
import {
  updateHaTokenMarksInTotal,
} from "./marksAggregation";
import {
  HaTokenBalance,
  MarksMultiplier,
  UserTotalMarks,
  PriceFeed,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { ERC20 } from "../generated/HaToken_haPB/ERC20";
import { ChainlinkAggregator } from "../generated/HaToken_haPB/ChainlinkAggregator";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");

// Helper to get or create ha token balance
function getOrCreateHaTokenBalance(
  tokenAddress: Bytes,
  userAddress: Bytes
): HaTokenBalance {
  const id = `${tokenAddress.toHexString()}-${userAddress.toHexString()}`;
  let balance = HaTokenBalance.load(id);
  
  if (balance == null) {
    balance = new HaTokenBalance(id);
    balance.tokenAddress = tokenAddress;
    balance.user = userAddress;
    balance.balance = BigInt.fromI32(0);
    balance.balanceUSD = BigDecimal.fromString("0");
    balance.marksPerDay = BigDecimal.fromString("0");
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.totalMarksEarned = BigDecimal.fromString("0");
    balance.firstSeenAt = BigInt.fromI32(0);
    balance.lastUpdated = BigInt.fromI32(0);
    balance.marketId = null;
    balance.save();
  }
  
  return balance;
}

// Simplified price feed - just return $1 for now
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

// Simplified USD calculation
function calculateBalanceUSD(balance: BigInt, tokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  const priceFeed = getOrCreatePriceFeed(tokenAddress, block);
  const balanceDecimal = balance.toBigDecimal().div(BigDecimal.fromString("1000000000000000000")); // 18 decimals
  return balanceDecimal.times(priceFeed.priceUSD);
}

// Query contract balance directly
function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);
  const balanceResult = token.try_balanceOf(userAddress);
  
  if (balanceResult.reverted) {
    return BigInt.fromI32(0);
  }
  
  return balanceResult.value;
}

// Get multiplier (simplified)
function getHaTokenMultiplier(tokenAddress: Bytes, timestamp: BigInt): BigDecimal {
  const id = `haToken-${tokenAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);
  
  if (multiplier == null) {
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = "haToken";
    multiplier.sourceAddress = tokenAddress;
    multiplier.multiplier = DEFAULT_MULTIPLIER;
    multiplier.effectiveFrom = timestamp;
    multiplier.updatedAt = timestamp;
    multiplier.updatedBy = null;
    multiplier.save();
  }
  
  return multiplier.multiplier;
}

// Accumulate marks (simplified - no complex time calculations for now)
function accumulateMarks(
  balance: HaTokenBalance,
  block: ethereum.Block
): void {
  const currentTimestamp = block.timestamp;
  
  if (balance.balance.equals(BigInt.fromI32(0))) {
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.marksPerDay = BigDecimal.fromString("0");
    balance.lastUpdated = currentTimestamp;
    balance.save();
    return;
  }
  
  // Get multiplier
  const multiplier = getHaTokenMultiplier(balance.tokenAddress, currentTimestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
  
  // Calculate time since last update
  const lastUpdate = balance.lastUpdated.gt(BigInt.fromI32(0)) 
    ? balance.lastUpdated 
    : balance.firstSeenAt;
  
  if (lastUpdate.equals(BigInt.fromI32(0))) {
    // First time seeing this balance
    balance.firstSeenAt = currentTimestamp;
    balance.lastUpdated = currentTimestamp;
    balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.save();
    return;
  }
  
  // Calculate time since last update (continuous accumulation)
  // Marks are awarded for all time held, including partial days
  // Frontend will estimate marks between graph updates
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    // Only count full days (snapshot approach - like polling once per day)
    // This means if someone holds tokens for 1.5 days, they get marks for 1 full day
    // Count all time (including partial days)
    // If someone holds tokens for 2 hours, they get marks for 2/24 of a day
    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      // Use the balance USD from the last snapshot (the balance held during this time)
      const marksAccumulated = balance.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      balance.accumulatedMarks = balance.accumulatedMarks.plus(marksAccumulated);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(marksAccumulated);
      
      // Update lastUpdated to current timestamp (continuous tracking)
      balance.lastUpdated = currentTimestamp;
    }
  }
  
  // Update marks per day rate based on current balance
  balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
  balance.save();
}

// Main handler - Simplified daily snapshot approach
// On each transfer, we:
// 1. Accumulate marks for full days since last update (daily snapshot)
// 2. Update the balance snapshot
// 3. Reset the snapshot timer
export function handleHaTokenTransfer(event: TransferEvent): void {
  const tokenAddress = event.address;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;
  
  // Skip zero address transfers
  const zeroAddress = Address.fromString("0x0000000000000000000000000000000000000000");
  
  // Update sender balance (if not zero address)
  if (!from.equals(zeroAddress)) {
    const fromBalance = getOrCreateHaTokenBalance(tokenAddress, from);
    
    // Accumulate marks for full days since last snapshot
    accumulateMarks(fromBalance, event.block);
    
    // Query actual balance from contract (daily snapshot value)
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(from);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    // Update balance snapshot
    fromBalance.balance = actualBalance;
    fromBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    // Reset if balance goes to zero
    if (actualBalance.equals(BigInt.fromI32(0))) {
      fromBalance.accumulatedMarks = BigDecimal.fromString("0");
      fromBalance.firstSeenAt = BigInt.fromI32(0);
      fromBalance.lastUpdated = timestamp; // Reset snapshot time
    }
    // Note: lastUpdated is already updated in accumulateMarks() to the start of current day
    
    fromBalance.save();
    updateHaTokenMarksInTotal(from, fromBalance, timestamp);
  }
  
  // Update receiver balance (if not zero address)
  if (!to.equals(zeroAddress)) {
    const toBalance = getOrCreateHaTokenBalance(tokenAddress, to);
    
    // Accumulate marks for full days since last snapshot
    accumulateMarks(toBalance, event.block);
    
    // Query actual balance from contract (daily snapshot value)
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(to);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    // Update balance snapshot
    toBalance.balance = actualBalance;
    toBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    // Set first seen if this is first time having balance
    if (toBalance.firstSeenAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
      toBalance.firstSeenAt = timestamp;
      toBalance.lastUpdated = timestamp; // Initialize snapshot time
    }
    // Note: lastUpdated is already updated in accumulateMarks() to the start of current day
    
    toBalance.save();
    updateHaTokenMarksInTotal(to, toBalance, timestamp);
  }
}
