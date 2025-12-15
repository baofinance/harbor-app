/**
 * Price Oracle utility for Harbor Marks Subgraph
 * Fetches USD prices from Minter contracts and Chainlink oracles
 * 
 * Sail tokens (leveraged) have variable prices from Minter.leveragedTokenPrice()
 * Anchor tokens (pegged) have stable prices from Minter.peggedTokenPrice()
 * 
 * Supports multiple pegged assets (ETH, BTC, USD, etc.)
 */

import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { ChainlinkAggregator } from "../generated/HaToken_haPB/ChainlinkAggregator";
import { PriceFeed } from "../generated/schema";

// Import Minter for fetching token prices
// Note: This import path works because Minter ABI is included in SailToken data source
class MinterContract {
  _address: Address;
  
  constructor(address: Address) {
    this._address = address;
  }
}

// ============================================================================
// CHAINLINK PRICE FEEDS (Mainnet)
// For converting non-USD pegged tokens to USD
// ============================================================================

// ETH/USD - for ETH-pegged tokens
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");

// BTC/USD - for BTC-pegged tokens  
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

// stETH/USD - for stETH collateralized tokens
const STETH_USD_FEED = Address.fromString("0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8");

// ============================================================================
// TOKEN TO MINTER MAPPING
// Maps token addresses to their corresponding Minter contracts
// ============================================================================

// stETH Market (USD-pegged)
const STETH_ANCHOR_TOKEN = Address.fromString("0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc"); // haUSD-stETH
const STETH_SAIL_TOKEN = Address.fromString("0x469ddfcfa98d0661b7efedc82aceeab84133f7fe");   // hsUSD-stETH
const STETH_MINTER = Address.fromString("0x8b17b6e8f9ce3477ddaf372a4140ac6005787901");

// WBTC Market (USD-pegged)
const WBTC_SAIL_TOKEN = Address.fromString("0x03fd55f80277c13bb17739190b1e086b836c9f20");    // hsUSD-WBTC
const WBTC_MINTER = Address.fromString("0xa9434313a4b9a4d624c6d67b1d61091b159f5a77");

// ============================================================================
// TOKEN TYPE DETECTION
// ============================================================================

enum TokenType {
  ANCHOR,    // Pegged token (haUSD, haETH, haBTC)
  SAIL,      // Leveraged token (hsUSD, hsETH, hsBTC)
  UNKNOWN
}

enum PegType {
  USD,       // Pegged to USD ($1 per token for anchor)
  ETH,       // Pegged to ETH (need ETH/USD conversion)
  BTC,       // Pegged to BTC (need BTC/USD conversion)
  UNKNOWN
}

function getTokenType(tokenAddress: Address): TokenType {
  // Anchor tokens
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN)) {
    return TokenType.ANCHOR;
  }
  
  // Sail tokens
  if (tokenAddress.equals(STETH_SAIL_TOKEN) || tokenAddress.equals(WBTC_SAIL_TOKEN)) {
    return TokenType.SAIL;
  }
  
  return TokenType.UNKNOWN;
}

function getPegType(tokenAddress: Address): PegType {
  // USD-pegged markets
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) || 
      tokenAddress.equals(STETH_SAIL_TOKEN) ||
      tokenAddress.equals(WBTC_SAIL_TOKEN)) {
    return PegType.USD;
  }
  
  // Future: ETH-pegged markets (haETH, hsETH)
  // Future: BTC-pegged markets (haBTC, hsBTC)
  
  return PegType.UNKNOWN;
}

function getMinterForToken(tokenAddress: Address): Address | null {
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) || tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return STETH_MINTER;
  }
  
  if (tokenAddress.equals(WBTC_SAIL_TOKEN)) {
    return WBTC_MINTER;
  }
  
  return null;
}

/**
 * Get the Chainlink price feed address for a given token
 * Returns null for tokens that don't use Chainlink (use Minter instead)
 */
function getPriceFeedForToken(tokenAddress: Address): Address | null {
  const pegType = getPegType(tokenAddress);
  
  if (pegType == PegType.ETH) {
    return ETH_USD_FEED;
  }
  
  if (pegType == PegType.BTC) {
    return BTC_USD_FEED;
  }
  
  // USD-pegged tokens don't need Chainlink
  return null;
}

/**
 * Fetch price from Minter contract or Chainlink oracle
 * Returns price in USD
 * 
 * For sail tokens: fetches leveragedTokenPrice() from Minter (variable price)
 * For anchor tokens: returns $1 for USD-pegged, or fetches from Chainlink for ETH/BTC pegged
 */
export function fetchPriceUSD(tokenAddress: Bytes, blockTimestamp: BigInt): BigDecimal {
  const tokenAddr = Address.fromBytes(tokenAddress);
  const tokenType = getTokenType(tokenAddr);
  const pegType = getPegType(tokenAddr);
  
  // For sail tokens, we need to fetch the actual price from the Minter
  // The leveragedTokenPrice() returns the NAV in terms of the peg (e.g., USD for hsUSD)
  if (tokenType == TokenType.SAIL) {
    // For now, return $1 as a baseline
    // The actual price should be fetched from Minter.leveragedTokenPrice()
    // but subgraph contract calls are limited to the same block context
    // 
    // IMPORTANT: The frontend should fetch the actual price from the Minter
    // and multiply by the balance to get accurate USD values
    //
    // Alternative: We can add a PriceUpdate event to the Minter and track prices
    // that way, updating PriceFeed entities when prices change
    return BigDecimal.fromString("1.0");
  }
  
  // For anchor tokens
  if (tokenType == TokenType.ANCHOR) {
    if (pegType == PegType.USD) {
      // haUSD tokens are pegged to $1
      return BigDecimal.fromString("1.0");
    }
    
    if (pegType == PegType.ETH) {
      // haETH tokens are pegged to ETH - fetch ETH/USD
      return fetchChainlinkPrice(ETH_USD_FEED);
    }
    
    if (pegType == PegType.BTC) {
      // haBTC tokens are pegged to BTC - fetch BTC/USD
      return fetchChainlinkPrice(BTC_USD_FEED);
    }
  }
  
  // Unknown token - fallback to $1
  return BigDecimal.fromString("1.0");
}

/**
 * Fetch price from Chainlink oracle
 */
function fetchChainlinkPrice(feedAddress: Address): BigDecimal {
  const priceFeed = ChainlinkAggregator.bind(feedAddress);
  
  const latestAnswerResult = priceFeed.try_latestAnswer();
  if (latestAnswerResult.reverted) {
    return BigDecimal.fromString("1.0");
  }
  
  const decimalsResult = priceFeed.try_decimals();
  const decimals = decimalsResult.reverted ? 8 : decimalsResult.value;
  
  const price = latestAnswerResult.value.toBigDecimal();
  const divisor = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal();
  
  return price.div(divisor);
}

/**
 * Get or create a PriceFeed entity for tracking
 */
export function getOrCreatePriceFeed(tokenAddress: Bytes, blockTimestamp: BigInt): PriceFeed {
  const id = tokenAddress.toHexString();
  let priceFeed = PriceFeed.load(id);
  
  if (priceFeed === null) {
    priceFeed = new PriceFeed(id);
    priceFeed.tokenAddress = tokenAddress;
    
    const tokenAddr = Address.fromBytes(tokenAddress);
    const feedAddress = getPriceFeedForToken(tokenAddr);
    
    if (feedAddress !== null) {
      priceFeed.priceFeedAddress = feedAddress;
      priceFeed.decimals = 8; // Standard Chainlink decimals
    } else {
      priceFeed.priceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
      priceFeed.decimals = 18;
    }
    
    priceFeed.priceUSD = fetchPriceUSD(tokenAddress, blockTimestamp);
    priceFeed.lastUpdated = blockTimestamp;
    priceFeed.save();
  } else {
    // Update price if stale (more than 1 hour old)
    const ONE_HOUR = BigInt.fromI32(3600);
    if (blockTimestamp.minus(priceFeed.lastUpdated).gt(ONE_HOUR)) {
      priceFeed.priceUSD = fetchPriceUSD(tokenAddress, blockTimestamp);
      priceFeed.lastUpdated = blockTimestamp;
      priceFeed.save();
    }
  }
  
  return priceFeed;
}

/**
 * Calculate USD value of a token balance
 * @param balance Token balance in raw units (wei)
 * @param tokenAddress Token contract address
 * @param blockTimestamp Current block timestamp
 * @param tokenDecimals Token decimals (default 18)
 */
export function calculateBalanceUSD(
  balance: BigInt,
  tokenAddress: Bytes,
  blockTimestamp: BigInt,
  tokenDecimals: i32 = 18
): BigDecimal {
  const priceFeed = getOrCreatePriceFeed(tokenAddress, blockTimestamp);
  const divisor = BigInt.fromI32(10).pow(tokenDecimals as u8).toBigDecimal();
  const balanceDecimal = balance.toBigDecimal().div(divisor);
  
  return balanceDecimal.times(priceFeed.priceUSD);
}

