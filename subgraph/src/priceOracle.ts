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
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";

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

// stETH Market (USD-pegged) - legacy/test
const STETH_ANCHOR_TOKEN = Address.fromString("0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc"); // haUSD-stETH (legacy)
const STETH_SAIL_TOKEN = Address.fromString("0x469ddfcfa98d0661b7efedc82aceeab84133f7fe"); // hsUSD-stETH (legacy)
const STETH_MINTER = Address.fromString("0x8b17b6e8f9ce3477ddaf372a4140ac6005787901");

// Production v1 Sail tokens (mainnet)
const HS_FXUSD_ETH = Address.fromString("0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C"); // hsFXUSD-ETH
const HS_FXUSD_BTC = Address.fromString("0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B"); // hsFXUSD-BTC
const HS_STETH_BTC = Address.fromString("0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD"); // hsSTETH-BTC

// Production v1 minters (mainnet)
const MINTER_ETH_FXUSD = Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F");
const MINTER_BTC_FXUSD = Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888");
const MINTER_BTC_STETH = Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919");

// ETH-pegged tokens
// NOTE: We support both production + test2 deployments (mainnet).
const HAETH_TOKEN_PROD = Address.fromString("0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5"); // haETH (prod ETH/fxUSD)
const HAETH_TOKEN_TEST2 = Address.fromString("0x8e7442020ba7debfd77e67491c51faa097d87478"); // haETH (test2 ETH/fxUSD)

// BTC-pegged tokens
const HABTC_TOKEN_PROD = Address.fromString("0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7"); // haBTC (prod BTC/*)
const HABTC_TOKEN_TEST2 = Address.fromString("0x1822bbe8fe313c4b53414f0b3e5ef8147d485530"); // haBTC (test2 BTC/*)

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
      tokenAddress.equals(HAETH_TOKEN_PROD) ||
      tokenAddress.equals(HAETH_TOKEN_TEST2) ||
      tokenAddress.equals(HABTC_TOKEN_PROD) ||
      tokenAddress.equals(HABTC_TOKEN_TEST2)) {
    return TokenType.ANCHOR;
  }
  
  // Sail tokens
  if (
      tokenAddress.equals(STETH_SAIL_TOKEN) ||
      tokenAddress.equals(HS_FXUSD_ETH) ||
      tokenAddress.equals(HS_FXUSD_BTC) ||
      tokenAddress.equals(HS_STETH_BTC)
  ) {
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

  // ETH-pegged sail token (leveragedTokenPrice denominated in ETH)
  if (tokenAddress.equals(HS_FXUSD_ETH)) {
    return PegType.ETH;
  }
  // BTC-pegged sail tokens (leveragedTokenPrice denominated in BTC)
  if (tokenAddress.equals(HS_FXUSD_BTC) || tokenAddress.equals(HS_STETH_BTC)) {
    return PegType.BTC;
  }
  
  // ETH-pegged markets
  if (tokenAddress.equals(HAETH_TOKEN_PROD) || tokenAddress.equals(HAETH_TOKEN_TEST2)) {
    return PegType.ETH;
  }
  
  // BTC-pegged markets
  if (tokenAddress.equals(HABTC_TOKEN_PROD) || tokenAddress.equals(HABTC_TOKEN_TEST2)) {
    return PegType.BTC;
  }
  
  return PegType.UNKNOWN;
}

function getMinterForToken(tokenAddress: Address): Address | null {
  if (tokenAddress.equals(STETH_ANCHOR_TOKEN) || tokenAddress.equals(STETH_SAIL_TOKEN)) {
    return STETH_MINTER;
  }

  // Production v1
  if (tokenAddress.equals(HS_FXUSD_ETH)) return MINTER_ETH_FXUSD;
  if (tokenAddress.equals(HS_FXUSD_BTC)) return MINTER_BTC_FXUSD;
  if (tokenAddress.equals(HS_STETH_BTC)) return MINTER_BTC_STETH;
  
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
    const minterAddress = getMinterForToken(tokenAddr);
    if (minterAddress == null) {
      // Unknown token, fall back to $1
      return BigDecimal.fromString("1.0");
    }

    const minter = Minter.bind(minterAddress as Address);
    const priceRes = minter.try_leveragedTokenPrice();
    if (priceRes.reverted) {
      return BigDecimal.fromString("1.0");
    }

    // leveragedTokenPrice() is 18 decimals in PEG units (ETH/BTC/USD)
    const ONE_E18 = BigDecimal.fromString("1000000000000000000");
    const priceInPeg = priceRes.value.toBigDecimal().div(ONE_E18);

    // Convert peg units to USD if needed
    if (pegType == PegType.ETH) {
      const ethUsd = fetchChainlinkPrice(ETH_USD_FEED);
      return priceInPeg.times(ethUsd);
    }
    if (pegType == PegType.BTC) {
      const btcUsd = fetchChainlinkPrice(BTC_USD_FEED);
      return priceInPeg.times(btcUsd);
    }
    // USD peg
    return priceInPeg;
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

