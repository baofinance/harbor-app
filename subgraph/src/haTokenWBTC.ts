/**
 * ha Token (Leveraged) balance tracking for WBTC market
 * Tracks ERC20 Transfer events to calculate user balances and marks
 */

import {
  Transfer as TransferEvent,
} from "../generated/HaToken_hsWBTC/ERC20";
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
import { ERC20 } from "../generated/HaToken_hsWBTC/ERC20";

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
    balance.marketId = "WBTC";
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
    priceFeed.priceUSD = BigDecimal.fromString("1.0");
    priceFeed.decimals = 8;
    priceFeed.lastUpdated = block.timestamp;
    priceFeed.save();
  }
  
  return priceFeed;
}

// Simplified USD calculation
function calculateBalanceUSD(balance: BigInt, tokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  const priceFeed = getOrCreatePriceFeed(tokenAddress, block);
  const balanceDecimal = balance.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
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

// Get multiplier
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

// Accumulate marks
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
  
  const multiplier = getHaTokenMultiplier(balance.tokenAddress, currentTimestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
  
  const lastUpdate = balance.lastUpdated.gt(BigInt.fromI32(0)) 
    ? balance.lastUpdated 
    : balance.firstSeenAt;
  
  if (lastUpdate.equals(BigInt.fromI32(0))) {
    balance.firstSeenAt = currentTimestamp;
    balance.lastUpdated = currentTimestamp;
    balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.save();
    return;
  }
  
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      const marksAccumulated = balance.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      balance.accumulatedMarks = balance.accumulatedMarks.plus(marksAccumulated);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(marksAccumulated);
      balance.lastUpdated = currentTimestamp;
    }
  }
  
  balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
  balance.save();
}

// Main handler
export function handleHaTokenTransfer(event: TransferEvent): void {
  const tokenAddress = event.address;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;
  
  const zeroAddress = Address.fromString("0x0000000000000000000000000000000000000000");
  
  // Update sender balance
  if (!from.equals(zeroAddress)) {
    const fromBalance = getOrCreateHaTokenBalance(tokenAddress, from);
    accumulateMarks(fromBalance, event.block);
    
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(from);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    fromBalance.balance = actualBalance;
    fromBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    if (actualBalance.equals(BigInt.fromI32(0))) {
      fromBalance.accumulatedMarks = BigDecimal.fromString("0");
      fromBalance.firstSeenAt = BigInt.fromI32(0);
      fromBalance.lastUpdated = timestamp;
    }
    
    fromBalance.save();
    updateHaTokenMarksInTotal(from, fromBalance, timestamp);
  }
  
  // Update receiver balance
  if (!to.equals(zeroAddress)) {
    const toBalance = getOrCreateHaTokenBalance(tokenAddress, to);
    accumulateMarks(toBalance, event.block);
    
    const tokenContract = Address.fromBytes(tokenAddress);
    const userContract = Address.fromBytes(to);
    const actualBalance = queryTokenBalance(tokenContract, userContract);
    
    toBalance.balance = actualBalance;
    toBalance.balanceUSD = calculateBalanceUSD(actualBalance, tokenAddress, event.block);
    
    if (toBalance.firstSeenAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
      toBalance.firstSeenAt = timestamp;
      toBalance.lastUpdated = timestamp;
    }
    
    toBalance.save();
    updateHaTokenMarksInTotal(to, toBalance, timestamp);
  }
}


