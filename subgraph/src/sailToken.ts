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
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";
import { ChainlinkAggregator } from "../generated/Minter_ETH_fxUSD/ChainlinkAggregator";
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
import { accrueWithBoostWindow } from "./marksAccrual";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("5.0"); // 5x for sail tokens (default)
const PROMO_MULTIPLIER = BigDecimal.fromString("2.0"); // Additional 2x promo (wallet hsTokens only)
const ONE_BD = BigDecimal.fromString("1.0");
// Promo starts at (new subgraph deploy time). This gate prevents backdating during reindex.
// Update this constant when you redeploy a new promo start.
const SAIL_PROMO_START_TIMESTAMP = BigInt.fromI32(1768355397);
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const ONE_ETHER = BigDecimal.fromString("1000000000000000000");

// Chainlink (mainnet) feeds
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

// ============================================================================
// TOKEN TO MINTER MAPPING
// Maps sail token addresses to their corresponding Minter contracts
// ============================================================================

// Production v1 Sail tokens (mainnet)
const HS_FXUSD_ETH = Address.fromString("0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C"); // hsFXUSD-ETH
const HS_FXUSD_BTC = Address.fromString("0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B"); // hsFXUSD-BTC
const HS_STETH_BTC = Address.fromString("0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD"); // hsSTETH-BTC

// Production v1 minters (mainnet)
const MINTER_ETH_FXUSD = Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F");
const MINTER_BTC_FXUSD = Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888");
const MINTER_BTC_STETH = Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919");

/**
 * Get the Minter address for a sail token
 */
function getMinterForSailToken(tokenAddress: Address): Address | null {
  if (tokenAddress.equals(HS_FXUSD_ETH)) return MINTER_ETH_FXUSD;
  if (tokenAddress.equals(HS_FXUSD_BTC)) return MINTER_BTC_FXUSD;
  if (tokenAddress.equals(HS_STETH_BTC)) return MINTER_BTC_STETH;
  return null;
}

/**
 * Fetch sail token price from Minter.leveragedTokenPrice()
 * Returns price in USD (18 decimals scaled to BigDecimal)
 */
function fetchSailTokenPrice(tokenAddress: Address): BigDecimal {
  const minterAddress = getMinterForSailToken(tokenAddress);
  
  if (minterAddress === null) {
    // Unknown token
    return BigDecimal.fromString("0");
  }
  
  const minter = Minter.bind(minterAddress);
  const priceResult = minter.try_leveragedTokenPrice();
  
  if (priceResult.reverted) {
    return BigDecimal.fromString("0");
  }
  
  // leveragedTokenPrice() returns NAV in PEG units (ETH/BTC/USD) with 18 decimals.
  const priceInPeg = priceResult.value.toBigDecimal().div(ONE_ETHER);

  // Convert PEG -> USD for BTC/ETH markets
  let pegUsd = BigDecimal.fromString("1.0");
  if (tokenAddress.equals(HS_FXUSD_ETH)) {
    pegUsd = chainlinkUsd(ETH_USD_FEED);
  } else if (tokenAddress.equals(HS_FXUSD_BTC) || tokenAddress.equals(HS_STETH_BTC)) {
    pegUsd = chainlinkUsd(BTC_USD_FEED);
  }

  return priceInPeg.times(pegUsd);
}

function chainlinkUsd(feed: Address): BigDecimal {
  const oracle = ChainlinkAggregator.bind(feed);
  const res = oracle.try_latestAnswer();
  if (res.reverted) return BigDecimal.fromString("0");
  // standard Chainlink 8 decimals
  return res.value.toBigDecimal().div(BigDecimal.fromString("100000000"));
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
  // Promo is global for sail token WALLET positions only (hsTokens). Stacks on top of boost windows.
  const promo = timestamp.ge(SAIL_PROMO_START_TIMESTAMP) ? PROMO_MULTIPLIER : ONE_BD;
  const boost = getActiveBoostMultiplier("sailToken", tokenAddress, timestamp);
  return multiplier.multiplier.times(promo).times(boost);
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
  // Base marks/$/day excluding the market boost window (boost is handled by accrueWithBoostWindow).
  const baseMarksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(
    multiplier.div(getActiveBoostMultiplier("sailToken", balance.tokenAddress, currentTimestamp))
  );

  const lastUpdate = balance.lastUpdated.gt(BigInt.fromI32(0))
    ? balance.lastUpdated
    : balance.firstSeenAt;

  if (lastUpdate.equals(BigInt.fromI32(0))) {
    balance.firstSeenAt = currentTimestamp;
    balance.lastUpdated = currentTimestamp;
    // Current rate (includes promo + boost via multiplier)
    balance.marksPerDay = balance.balanceUSD.times(
      DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier)
    );
    balance.accumulatedMarks = BigDecimal.fromString("0");
    balance.save();
    return;
  }

  // Calculate time since last update (continuous accumulation)
  // Marks are awarded for all time held, including partial days
  // Frontend will estimate marks between graph updates
  if (currentTimestamp.gt(lastUpdate)) {
    const earned = accrueWithBoostWindow(
      "sailToken",
      balance.tokenAddress,
      lastUpdate,
      currentTimestamp,
      balance.balanceUSD,
      baseMarksPerDollarPerDay
    );
    if (earned.gt(BigDecimal.fromString("0"))) {
      balance.accumulatedMarks = balance.accumulatedMarks.plus(earned);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(earned);
    }
  }
  // Current rate (includes promo + current boost window if active)
  balance.marksPerDay = balance.balanceUSD.times(DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier));
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

