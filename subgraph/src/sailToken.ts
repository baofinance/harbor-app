/**
 * Sail Token balance tracking for Harbor Marks
 * Tracks ERC20 Transfer events to calculate user balances and marks
 * Sail tokens (leveraged tokens, hs) have a 5x marks multiplier by default
 * 
 * IMPORTANT: Sail tokens have VARIABLE prices (not pegged to $1)
 * The price is fetched from Minter.leveragedTokenPrice()
 */

import { Transfer as TransferEvent } from "../generated/SailToken_hsPB/ERC20";
import { ERC20 } from "../generated/SailToken_hsPB/ERC20";
import { Minter } from "../generated/SailToken_hsPB/Minter";
import {
  updateSailTokenMarksInTotal,
} from "./marksAggregation";
import {
  SailTokenBalance,
  MarksMultiplier,
  PriceFeed,
  UserTotalMarks,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import {
  SAIL_BOOST_MULTIPLIER,
  getActiveBoostMultiplier,
  getOrCreateMarketBoostWindow,
} from "./marksBoost";
import { ensureUserRegistered } from "./userRegistry";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("5.0"); // 5x for sail tokens (default)
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const ONE_ETHER = BigDecimal.fromString("1000000000000000000");

// ============================================================================
// TOKEN TO MINTER MAPPING
// Maps sail token addresses to their corresponding Minter contracts
// ============================================================================

// stETH Market (USD-pegged)
const STETH_SAIL_TOKEN = Address.fromString("0x469ddfcfa98d0661b7efedc82aceeab84133f7fe");   // hsUSD-stETH
const STETH_MINTER = Address.fromString("0x8b17b6e8f9ce3477ddaf372a4140ac6005787901");

/**
 * Get the Minter address for a sail token
 */
function getMinterForSailToken(tokenAddress: Address): Address | null {
  if (tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return STETH_MINTER;
  }
  return null;
}

/**
 * Fetch sail token price from Minter.leveragedTokenPrice()
 * Returns price in USD (18 decimals scaled to BigDecimal)
 */
function fetchSailTokenPrice(tokenAddress: Address): BigDecimal {
  const minterAddress = getMinterForSailToken(tokenAddress);
  
  if (minterAddress === null) {
    // Unknown token - fallback to $1
    return BigDecimal.fromString("1.0");
  }
  
  const minter = Minter.bind(minterAddress);
  const priceResult = minter.try_leveragedTokenPrice();
  
  if (priceResult.reverted) {
    // If call fails, fallback to $1
    return BigDecimal.fromString("1.0");
  }
  
  // leveragedTokenPrice() returns price with 18 decimals
  return priceResult.value.toBigDecimal().div(ONE_ETHER);
}

/**
 * Calculate USD value of sail token balance
 * Uses actual leveraged token price from Minter
 */
function calculateBalanceUSDForToken(balance: BigInt, tokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  const tokenAddr = Address.fromBytes(tokenAddress);
  const price = fetchSailTokenPrice(tokenAddr);
  
  // Convert balance from wei to token units (18 decimals)
  const balanceDecimal = balance.toBigDecimal().div(ONE_ETHER);
  
  return balanceDecimal.times(price);
}

// Helper to get or create sail token balance
function getOrCreateSailTokenBalance(
  tokenAddress: Bytes,
  userAddress: Bytes
): SailTokenBalance {
  const id = `${tokenAddress.toHexString()}-${userAddress.toHexString()}`;
  let balance = SailTokenBalance.load(id);

  if (balance == null) {
    balance = new SailTokenBalance(id);
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

// Helper to query actual token balance from contract
function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);
  const balanceResult = token.try_balanceOf(userAddress);
  if (balanceResult.reverted) {
    return BigInt.fromI32(0);
  }
  return balanceResult.value;
}

// Get multiplier for sail token (default 5x)
function getSailTokenMultiplier(tokenAddress: Bytes, timestamp: BigInt): BigDecimal {
  const sourceType = "sailToken";
  const id = `${sourceType}-${tokenAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);

  if (multiplier == null) {
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = sourceType;
    multiplier.sourceAddress = tokenAddress;
    multiplier.multiplier = DEFAULT_MULTIPLIER; // 5x default
    multiplier.effectiveFrom = timestamp;
    multiplier.updatedAt = timestamp;
    multiplier.updatedBy = null;
    multiplier.save();
  }
  const boost = getActiveBoostMultiplier("sailToken", tokenAddress, timestamp);
  return multiplier.multiplier.times(boost);
}

// Helper to accumulate marks (daily snapshot approach)
function accumulateMarks(
  balance: SailTokenBalance,
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

  const multiplier = getSailTokenMultiplier(balance.tokenAddress, currentTimestamp);
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

  // Calculate time since last update (continuous accumulation)
  // Marks are awarded for all time held, including partial days
  // Frontend will estimate marks between graph updates
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const daysSinceLastUpdate = timeSinceLastUpdate.toBigDecimal().div(SECONDS_PER_DAY);

    // Count all time (including partial days)
    // If someone holds tokens for 2 hours, they get marks for 2/24 of a day
    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      const marksAccumulated = balance.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      balance.accumulatedMarks = balance.accumulatedMarks.plus(marksAccumulated);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(marksAccumulated);

      // Update lastUpdated to current timestamp (continuous tracking)
      balance.lastUpdated = currentTimestamp;
    }
  }
  balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
  balance.save();
}

// Handler for Transfer event
export function handleSailTokenTransfer(event: TransferEvent): void {
  const tokenAddress = event.address;
  const fromAddress = event.params.from;
  const toAddress = event.params.to;
  const timestamp = event.block.timestamp;

  // Ensure we have a market-level boost window (set once on first activity)
  getOrCreateMarketBoostWindow(
    "sailToken",
    tokenAddress,
    timestamp,
    SAIL_BOOST_MULTIPLIER
  );

  // Handle sender (if not zero address)
  if (!fromAddress.equals(Address.fromHexString("0x0000000000000000000000000000000000000000"))) {
    const senderBalance = getOrCreateSailTokenBalance(tokenAddress, fromAddress);
    accumulateMarks(senderBalance, event.block);
    
    const actualBalance = queryTokenBalance(Address.fromBytes(tokenAddress), fromAddress);
    senderBalance.balance = actualBalance;
    senderBalance.balanceUSD = calculateBalanceUSDForToken(actualBalance, tokenAddress, event.block);
    
    // Recalculate marksPerDay with updated balanceUSD
    const multiplier = getSailTokenMultiplier(tokenAddress, timestamp);
    const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
    senderBalance.marksPerDay = senderBalance.balanceUSD.times(marksPerDollarPerDay);
    
    if (senderBalance.firstSeenAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
      senderBalance.firstSeenAt = timestamp;
    }
    
    if (actualBalance.equals(BigInt.fromI32(0))) {
      senderBalance.accumulatedMarks = BigDecimal.fromString("0");
      senderBalance.firstSeenAt = BigInt.fromI32(0);
      senderBalance.marksPerDay = BigDecimal.fromString("0");
    }
    
    senderBalance.lastUpdated = timestamp;
    senderBalance.save();
    updateSailTokenMarksInTotal(fromAddress, senderBalance, timestamp);
    ensureUserRegistered(tokenAddress, fromAddress);
  }

  // Handle receiver (if not zero address)
  if (!toAddress.equals(Address.fromHexString("0x0000000000000000000000000000000000000000"))) {
    const receiverBalance = getOrCreateSailTokenBalance(tokenAddress, toAddress);
    accumulateMarks(receiverBalance, event.block);
    
    const actualBalance = queryTokenBalance(Address.fromBytes(tokenAddress), toAddress);
    receiverBalance.balance = actualBalance;
    receiverBalance.balanceUSD = calculateBalanceUSDForToken(actualBalance, tokenAddress, event.block);
    
    // Recalculate marksPerDay with updated balanceUSD
    const multiplier = getSailTokenMultiplier(tokenAddress, timestamp);
    const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
    receiverBalance.marksPerDay = receiverBalance.balanceUSD.times(marksPerDollarPerDay);
    
    if (receiverBalance.firstSeenAt.equals(BigInt.fromI32(0)) && actualBalance.gt(BigInt.fromI32(0))) {
      receiverBalance.firstSeenAt = timestamp;
    }
    
    receiverBalance.lastUpdated = timestamp;
    receiverBalance.save();
    updateSailTokenMarksInTotal(toAddress, receiverBalance, timestamp);
    ensureUserRegistered(tokenAddress, toAddress);
  }
}

