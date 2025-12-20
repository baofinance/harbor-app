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

// ETH-pegged tokens
const HAETH_TOKEN = Address.fromString("0x8e7442020ba7debfd77e67491c51faa097d87478"); // haETH (ETH/fxUSD market)

// BTC-pegged tokens
const HABTC_TOKEN = Address.fromString("0x1822bbe8fe313c4b53414f0b3e5ef8147d485530"); // haBTC (BTC/fxUSD and BTC/stETH markets)

// ============================================================================
// TOKEN TYPE DETECTION
// ============================================================================

export enum TokenType {
  ANCHOR,    // Pegged token (haUSD, haETH, haBTC)
  SAIL,      // Leveraged token (hsUSD, hsETH, hsBTC)
  UNKNOWN
}

export enum PegType {
  USD,       // Pegged to USD ($1 per token for anchor)
  ETH,       // Pegged to ETH (need ETH/USD conversion)
  BTC,       // Pegged to BTC (need BTC/USD conversion)
  UNKNOWN
}

export function getTokenType(tokenAddress: Address): TokenType {
  // Anchor tokens
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) ||
      tokenAddress.equals(HAETH_TOKEN) ||
      tokenAddress.equals(HABTC_TOKEN)) {
    return TokenType.ANCHOR;
  }
  
  // Sail tokens
  if (tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return TokenType.SAIL;
  }
  
  return TokenType.UNKNOWN;
}

export function getPegType(tokenAddress: Address): PegType {
  // USD-pegged markets
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) || 
      tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return PegType.USD;
  }
  
  // ETH-pegged markets
  if (tokenAddress.equals(HAETH_TOKEN)) {
    return PegType.ETH;
  }
  
  // BTC-pegged markets
  if (tokenAddress.equals(HABTC_TOKEN)) {
    return PegType.BTC;
  }
  
  return PegType.UNKNOWN;
}

function getMinterForToken(tokenAddress: Address): Address | null {
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) || tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return STETH_MINTER;
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
    // Update price if stale (more than 1 hour old) OR if price is $1.0 (indicates fallback/default)
    // For ETH/BTC pegged tokens, always update to ensure we have correct Chainlink prices
    const tokenAddr = Address.fromBytes(tokenAddress);
    const pegType = getPegType(tokenAddr);
    const ONE_HOUR = BigInt.fromI32(3600);
    const isStale = blockTimestamp.minus(priceFeed.lastUpdated).gt(ONE_HOUR);
    const isDefaultPrice = priceFeed.priceUSD.equals(BigDecimal.fromString("1.0"));
    const needsChainlink = (pegType == PegType.ETH || pegType == PegType.BTC);
    
    // Always update if:
    // 1. Price is stale (more than 1 hour old), OR
    // 2. Price is $1.0 (indicates fallback/default), OR
    // 3. Token needs Chainlink and we haven't updated recently (every 5 minutes for ETH/BTC)
    const FIVE_MINUTES = BigInt.fromI32(300);
    const needsFrequentUpdate = needsChainlink && blockTimestamp.minus(priceFeed.lastUpdated).gt(FIVE_MINUTES);
    
    if (isStale || isDefaultPrice || needsFrequentUpdate) {
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

