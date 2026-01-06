/**
 * Stability Pool Collateral event handlers for Harbor Marks tracking
 */

import {
  Deposit as StabilityPoolDepositEvent,
  Withdraw as StabilityPoolWithdrawEvent,
  UserDepositChange as UserDepositChangeEvent,
} from "../generated/StabilityPoolCollateral/StabilityPool";
import { StabilityPoolDeposit, MarksMultiplier } from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { StabilityPool } from "../generated/StabilityPoolCollateral_ETH_fxUSD/StabilityPool";
// Note: WrappedPriceOracle bindings are generated per data source, but we'll use a generic approach
// Import from Genesis_ETH_fxUSD as a reference (same ABI structure)
import { WrappedPriceOracle } from "../generated/Genesis_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/HaToken_haETH/ChainlinkAggregator";
import {
  ANCHOR_BOOST_MULTIPLIER,
  getActiveBoostMultiplier,
  getOrCreateMarketBoostWindow,
} from "./marksBoost";
import { ensureUserRegistered } from "./userRegistry";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("1.0");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const POOL_TYPE = "collateral";
const E18 = BigDecimal.fromString("1000000000000000000"); // 10^18

// Chainlink (mainnet) feeds
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

// Production v1 ha tokens (mainnet)
const HAETH = Address.fromString("0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5");
const HABTC = Address.fromString("0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7");

function assetTokenUsd(assetToken: Address): BigDecimal {
  if (assetToken.equals(HAETH)) return chainlinkUsd(ETH_USD_FEED);
  if (assetToken.equals(HABTC)) return chainlinkUsd(BTC_USD_FEED);
  // haUSD-like
  return BigDecimal.fromString("1.0");
}

function chainlinkUsd(feed: Address): BigDecimal {
  const oracle = ChainlinkAggregator.bind(feed);
  const res = oracle.try_latestAnswer();
  if (res.reverted) return BigDecimal.fromString("0");
  // standard Chainlink 8 decimals
  return res.value.toBigDecimal().div(BigDecimal.fromString("100000000"));
}

function pegUsdForPool(poolAddress: string): BigDecimal {
  // ETH/fxUSD collateral pool
  if (poolAddress == "0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb") {
    return chainlinkUsd(ETH_USD_FEED);
  }
  // BTC/fxUSD collateral pool
  if (poolAddress == "0x5378fbf71627e352211779bd4cd09b0a791015ac") {
    return chainlinkUsd(BTC_USD_FEED);
  }
  // BTC/stETH collateral pool
  if (poolAddress == "0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc") {
    return chainlinkUsd(BTC_USD_FEED);
  }
  // Default: assume USD peg (1.0)
  return BigDecimal.fromString("1.0");
}

// Price oracle addresses for each stability pool (legacy: used only for fallback/diagnostics)
// NOTE: Pool deposits are in ASSET_TOKEN (pegged ha token). We price ASSET_TOKEN directly via Chainlink (see below).
function getPriceOracleAddressForPool(poolAddress: string): string {
  // ETH/fxUSD market - collateral pool (fxSAVE deposits)
  if (poolAddress == "0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb") {
    return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // Same oracle as ETH/fxUSD genesis
  }
  // BTC/fxUSD market - collateral pool (fxSAVE deposits)
  if (poolAddress == "0x5378fbf71627e352211779bd4cd09b0a791015ac") {
    return "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6"; // Same oracle as BTC/fxUSD genesis
  }
  // BTC/stETH market - collateral pool (wstETH deposits)
  if (poolAddress == "0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc") {
    return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // Same oracle as BTC/stETH genesis
  }
  return "";
}

// Fallback prices if oracle fails (in USD) - legacy
function getFallbackPriceForPool(poolAddress: string): BigDecimal {
  // ETH/fxUSD and BTC/fxUSD collateral pools use fxSAVE
  if (poolAddress == "0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb" || 
      poolAddress == "0x5378fbf71627e352211779bd4cd09b0a791015ac") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07
  }
  // BTC/stETH collateral pool uses wstETH
  if (poolAddress == "0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc") {
    return BigDecimal.fromString("4000"); // wstETH ~$4000
  }
  return BigDecimal.fromString("1.0"); // Default fallback
}

/**
 * Fetch real-time price from the WrappedPriceOracle contract for stability pool deposits
 * Returns the wrapped token price in USD (underlying price * wrapped rate)
 *
 * NOTE: This is NOT used for marks pricing anymore (marks price ASSET_TOKEN directly).
 */
function getWrappedTokenPriceUSD(poolAddress: Bytes, block: ethereum.Block): BigDecimal {
  const poolAddressStr = poolAddress.toHexString();
  const oracleAddressStr = getPriceOracleAddressForPool(poolAddressStr);
  
  // If no oracle configured, use fallback
  if (oracleAddressStr == "") {
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  // Bind to the price oracle contract
  const oracleAddress = Address.fromString(oracleAddressStr);
  const oracle = WrappedPriceOracle.bind(oracleAddress);
  
  // Call latestAnswer() which returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
  const result = oracle.try_latestAnswer();
  
  if (result.reverted) {
    // Oracle call failed, use fallback
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  // Extract values (all in 18 decimals)
  const maxUnderlyingPrice = result.value.value1; // maxUnderlyingPrice
  const maxWrappedRate = result.value.value3; // maxWrappedRate
  
  // Convert from BigInt (18 decimals) to BigDecimal
  // IMPORTANT: For ETH/BTC-pegged markets, the oracle returns prices in PEG units, not USD.
  // We must convert PEG->USD using Chainlink.
  const underlyingPriceInPeg = maxUnderlyingPrice.toBigDecimal().div(E18);
  const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
  
  // Calculate wrapped token price in peg units then convert peg->USD
  const wrappedTokenPriceInPeg = underlyingPriceInPeg.times(wrappedRate);
  const pegUsd = pegUsdForPool(poolAddressStr);
  const wrappedTokenPriceUSD = pegUsd.gt(BigDecimal.fromString("0"))
    ? wrappedTokenPriceInPeg.times(pegUsd)
    : getFallbackPriceForPool(poolAddressStr);
  
  // Ensure we have a valid price
  if (wrappedTokenPriceUSD.le(BigDecimal.fromString("0"))) {
    return getFallbackPriceForPool(poolAddressStr);
  }
  
  return wrappedTokenPriceUSD;
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
    "stabilityPoolCollateral",
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
    "stabilityPoolCollateral",
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
  
  // Marks: pool deposits are in ASSET_TOKEN (pegged ha token). Price ASSET_TOKEN directly.
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? assetTokenUsd(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  
  // Update marks per day
  const boost = getActiveBoostMultiplier("stabilityPoolCollateral", poolAddress, timestamp);
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
    "stabilityPoolCollateral",
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
  
  // Calculate USD value using real-time oracle price
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = actualBalance.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? assetTokenUsd(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  const boost = getActiveBoostMultiplier("stabilityPoolCollateral", poolAddress, timestamp);
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
    "stabilityPoolCollateral",
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
  
  // Calculate USD value using real-time oracle price
  const assetToken = getPoolAssetToken(Address.fromBytes(poolAddress));
  const amountInTokens = newDeposit.toBigDecimal().div(E18);
  const assetPriceUSD = assetToken ? assetTokenUsd(assetToken as Address) : BigDecimal.fromString("0");
  deposit.balanceUSD = amountInTokens.times(assetPriceUSD);
  const boost = getActiveBoostMultiplier("stabilityPoolCollateral", poolAddress, timestamp);
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
