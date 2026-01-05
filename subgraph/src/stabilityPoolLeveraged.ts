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
// Note: Minter bindings are generated per data source, but we'll use a reference import
// Import from SailToken_hsFXUSD_ETH as a reference (same ABI structure)
import { Minter } from "../generated/SailToken_hsFXUSD_ETH/Minter";
import { ChainlinkAggregator } from "../generated/HaToken_haETH/ChainlinkAggregator";
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

// Chainlink (mainnet) feeds
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

function chainlinkUsd(feed: Address): BigDecimal {
  const oracle = ChainlinkAggregator.bind(feed);
  const res = oracle.try_latestAnswer();
  if (res.reverted) return BigDecimal.fromString("0");
  // standard Chainlink 8 decimals
  return res.value.toBigDecimal().div(BigDecimal.fromString("100000000"));
}

function pegUsdForPool(poolAddress: string): BigDecimal {
  // ETH/fxUSD leveraged pool
  if (poolAddress == "0x93d0472443d775e95bf1597c8c66dfe9093bfc48") {
    return chainlinkUsd(ETH_USD_FEED);
  }
  // BTC/fxUSD leveraged pool
  if (poolAddress == "0x8667592f836a8e2d19ce7879b8ae557297514f48") {
    return chainlinkUsd(BTC_USD_FEED);
  }
  // BTC/stETH leveraged pool
  if (poolAddress == "0x8d6307be018fcc42ad65e91b77c6b09c7ac9f0df") {
    return chainlinkUsd(BTC_USD_FEED);
  }
  // Default: assume USD peg (1.0)
  return BigDecimal.fromString("1.0");
}

// Map stability pool addresses to their corresponding Minter addresses
// Leveraged pools contain sail tokens, which get their price from Minter.leveragedTokenPrice()
function getMinterAddressForPool(poolAddress: string): string {
  // ETH/fxUSD market - leveraged pool (hsFXUSD-ETH deposits)
  if (poolAddress == "0x93d0472443d775e95bf1597c8c66dfe9093bfc48") {
    return "0x565f90dc7c022e7857734352c7bf645852d8d4e7"; // ETH/fxUSD minter
  }
  // BTC/fxUSD market - leveraged pool (hsFXUSD-BTC deposits)
  if (poolAddress == "0x8667592f836a8e2d19ce7879b8ae557297514f48") {
    return "0x7ffe3acb524fb40207709ba597d39c085d258f15"; // BTC/fxUSD minter
  }
  // BTC/stETH market - leveraged pool (hsSTETH-BTC deposits)
  if (poolAddress == "0x8d6307be018fcc42ad65e91b77c6b09c7ac9f0df") {
    return "0x042e7cb5b993312490ea07fb89f360a65b8a9056"; // BTC/stETH minter (from contracts.ts)
  }
  return "";
}

// Fallback price if Minter call fails (in USD)
function getFallbackPriceForPool(poolAddress: string): BigDecimal {
  // Sail tokens typically trade around $1 but can vary
  return BigDecimal.fromString("1.0");
}

/**
 * Fetch real-time price from the Minter contract for sail tokens in leveraged pools
 * Returns the sail token price in USD from Minter.leveragedTokenPrice()
 */
function getSailTokenPriceUSD(poolAddress: Bytes, block: ethereum.Block): BigDecimal {
  const poolAddressStr = poolAddress.toHexString();
  const minterAddressStr = getMinterAddressForPool(poolAddressStr);
  
  // If no minter configured, use fallback
  if (minterAddressStr == "") {
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  // Bind to the Minter contract
  const minterAddress = Address.fromString(minterAddressStr);
  const minter = Minter.bind(minterAddress);
  
  // leveragedTokenPrice() returns the NAV in terms of the peg (ETH/BTC/USD depending on market), 18 decimals
  const result = minter.try_leveragedTokenPrice();
  
  if (result.reverted) {
    // Minter call failed, use fallback
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  const priceInPeg = result.value.toBigDecimal().div(E18);
  const pegUsd = pegUsdForPool(poolAddressStr);
  const priceUSD = pegUsd.gt(BigDecimal.fromString("0"))
    ? priceInPeg.times(pegUsd)
    : getFallbackPriceForPool(poolAddressStr);
  
  // Ensure we have a valid price
  if (priceUSD.le(BigDecimal.fromString("0"))) {
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  return priceUSD;
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
  const sailTokenPriceUSD = getSailTokenPriceUSD(poolAddress, event.block);
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  deposit.balanceUSD = amountInTokens.times(sailTokenPriceUSD);
  
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
  
  // Calculate USD value using real-time Minter price for sail tokens (peg->USD converted)
  const sailTokenPriceUSD = getSailTokenPriceUSD(poolAddress, event.block);
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  deposit.balanceUSD = amountInTokens.times(sailTokenPriceUSD);
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
  
  // Calculate USD value using real-time Minter price for sail tokens
  const sailTokenPriceUSD = getSailTokenPriceUSD(poolAddress, event.block);
  const amountInTokens = newDeposit.toBigDecimal().div(E18);
  deposit.balanceUSD = amountInTokens.times(sailTokenPriceUSD);
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
