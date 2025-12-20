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
  calculateBalanceUSD,
  fetchPriceUSD,
  getTokenType,
  getPegType,
  TokenType,
  PegType,
} from "./priceOracle";
import {
  HaTokenBalance,
  MarksMultiplier,
  UserTotalMarks,
  PriceFeed,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { ERC20 } from "../generated/HaToken_haPB/ERC20";

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

// USD calculation now uses priceOracle module
function calculateBalanceUSDForToken(balance: BigInt, tokenAddress: Bytes, block: ethereum.Block): BigDecimal {
  return calculateBalanceUSD(balance, tokenAddress, block.timestamp, 18);
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
    fromBalance.balanceUSD = calculateBalanceUSDForToken(actualBalance, tokenAddress, event.block);
    
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
    toBalance.balanceUSD = calculateBalanceUSDForToken(actualBalance, tokenAddress, event.block);
    
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

// ============================================================================
// Hourly Price Update Block Handler
// Updates PriceFeed prices every hour to ensure marks are calculated with current prices
// ============================================================================

const LAST_UPDATE_KEY = "lastHourlyPriceUpdate";
const ONE_HOUR = BigInt.fromI32(3600);

// List of all token addresses that need price updates
function getTokensToUpdate(): Address[] {
  return [
    // ha tokens
    Address.fromString("0x8e7442020ba7debfd77e67491c51faa097d87478"), // haETH
    Address.fromString("0x1822bbe8fe313c4b53414f0b3e5ef8147d485530"), // haBTC
    // sail tokens
    Address.fromString("0x8248849b83ae20b21fa561f97ee5835a063c1f9c"), // hsFXUSD-ETH
    Address.fromString("0x454f2c12ce62a4fd813e2e06fda5d46e358e7c70"), // hsFXUSD-BTC
    Address.fromString("0x1df67ebd59db60a13ec783472aaf22e5b2b01f25"), // hsSTETH-BTC
    // collateral tokens (for stability pools)
    Address.fromString("0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb"), // fxSAVE (ETH/fxUSD collateral pool)
    Address.fromString("0x5378fbf71627e352211779bd4cd09b0a791015ac"), // fxSAVE (BTC/fxUSD collateral pool)
    Address.fromString("0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc"), // wstETH (BTC/stETH collateral pool)
  ];
}

function getLastUpdateTimestamp(): BigInt {
  let tracker = PriceFeed.load(LAST_UPDATE_KEY);
  if (tracker == null) {
    return BigInt.fromI32(0);
  }
  return tracker.lastUpdated;
}

function setLastUpdateTimestamp(timestamp: BigInt): void {
  let tracker = PriceFeed.load(LAST_UPDATE_KEY);
  if (tracker == null) {
    tracker = new PriceFeed(LAST_UPDATE_KEY);
    tracker.tokenAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    tracker.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    tracker.priceUSD = fetchPriceUSD(
      Address.fromString("0x0000000000000000000000000000000000000000"),
      timestamp
    );
    tracker.decimals = 18;
  }
  tracker.lastUpdated = timestamp;
  tracker.save();
}

/**
 * Block handler that runs on every block
 * Checks if an hour has passed since last update, and if so, updates all PriceFeed prices
 * 
 * Optimization: Only check every ~100 blocks to reduce overhead during sync
 */
export function handleBlock(block: ethereum.Block): void {
  // Handler is configured to run every 100 blocks in subgraph.yaml
  // This check is a safety measure in case the config doesn't work as expected
  if (block.number.mod(BigInt.fromI32(100)).gt(BigInt.fromI32(0))) {
    return; // Skip this block
  }
  
  const currentTimestamp = block.timestamp;
  const lastUpdate = getLastUpdateTimestamp();
  
  // Check if an hour has passed
  if (currentTimestamp.minus(lastUpdate).lt(ONE_HOUR)) {
    return; // Not time to update yet
  }
  
  // Update all PriceFeed prices
  const tokensToUpdate = getTokensToUpdate();
  for (let i = 0; i < tokensToUpdate.length; i++) {
    const tokenAddress = tokensToUpdate[i];
    const tokenAddressBytes = tokenAddress as Bytes;
    
    // Get or create PriceFeed
    let priceFeed = PriceFeed.load(tokenAddressBytes.toHexString());
    if (priceFeed == null) {
      // Create new PriceFeed if it doesn't exist
      priceFeed = new PriceFeed(tokenAddressBytes.toHexString());
      priceFeed.tokenAddress = tokenAddressBytes;
      
      // Determine price feed address based on token type
      const tokenType = getTokenType(tokenAddress);
      const pegType = getPegType(tokenAddress);
      
      if (tokenType == TokenType.ANCHOR && (pegType == PegType.ETH || pegType == PegType.BTC)) {
        // Use Chainlink for ETH/BTC pegged tokens
        if (pegType == PegType.ETH) {
          priceFeed.priceFeedAddress = Bytes.fromHexString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"); // ETH/USD
        } else {
          priceFeed.priceFeedAddress = Bytes.fromHexString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c"); // BTC/USD
        }
        priceFeed.decimals = 8; // Chainlink feeds use 8 decimals
      } else {
        // Default price feed (will be set by priceOracle)
        priceFeed.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
        priceFeed.decimals = 18;
      }
    }
    
    // Fetch and update price
    const newPrice = fetchPriceUSD(tokenAddress, currentTimestamp);
    priceFeed.priceUSD = newPrice;
    priceFeed.lastUpdated = currentTimestamp;
    priceFeed.save();
  }
  
  // Update last update timestamp
  setLastUpdateTimestamp(currentTimestamp);
}
