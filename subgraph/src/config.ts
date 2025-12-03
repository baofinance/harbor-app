/**
 * Configuration loader for marks multipliers and price feeds
 * Loads from config/marks-config.json (can be updated via GitHub)
 */

import { BigDecimal, Bytes } from "@graphprotocol/graph-ts";

// Default configuration (fallback if config file not available)
const DEFAULT_HA_TOKEN_MULTIPLIER = BigDecimal.fromString("1.0");
const DEFAULT_STABILITY_POOL_MULTIPLIER = BigDecimal.fromString("1.0");

// Price feed addresses (from bcinfo.local.json)
const WSTETH_USD_FEED = "0xeC827421505972a2AE9C320302d3573B42363C26";
const STETH_USD_FEED = "0xb007167714e2940013ec3bb551584130b7497e22";
const STETH_ETH_FEED = "0x6b39b761b1b64c8c095bf0e3bb0c6a74705b4788";

// Price feed decimals (Chainlink uses 8 decimals)
const PRICE_FEED_DECIMALS = 8;

/**
 * Get multiplier for ha token
 * Loads from config/marks-config.json (GitHub-controlled)
 * Falls back to default if config not available
 */
export function getHaTokenMultiplier(tokenAddress: Bytes): BigDecimal {
  // In production, this would load from config/marks-config.json
  // For now, using default - config file can be loaded at build time or via IPFS
  // The config file structure:
  // {
  //   "multipliers": {
  //     "haToken": {
  //       "default": 1.0,
  //       "perToken": {
  //         "0x...": 2.0  // per-token override
  //       }
  //     }
  //   }
  // }
  
  // TODO: Implement config file loading
  // Option 1: Load at build time and embed in subgraph
  // Option 2: Load from IPFS/GitHub at runtime (requires HTTP calls)
  // Option 3: Store config in subgraph entities (updated via admin events)
  
  return DEFAULT_HA_TOKEN_MULTIPLIER;
}

/**
 * Get multiplier for stability pool
 * Loads from config/marks-config.json (GitHub-controlled)
 */
export function getStabilityPoolMultiplier(
  poolAddress: Bytes,
  poolType: string
): BigDecimal {
  // In production, this would load from config/marks-config.json
  // The config file structure:
  // {
  //   "multipliers": {
  //     "stabilityPoolCollateral": {
  //       "default": 1.0,
  //       "perPool": {
  //         "0x...": 1.5  // per-pool override
  //       }
  //     },
  //     "stabilityPoolSail": {
  //       "default": 1.0,
  //       "perPool": {}
  //     }
  //   }
  // }
  
  // TODO: Implement config file loading (same as getHaTokenMultiplier)
  return DEFAULT_STABILITY_POOL_MULTIPLIER;
}

/**
 * Get price feed address for a token
 */
export function getPriceFeedAddress(tokenAddress: Bytes, pair: string): Bytes | null {
  // Map token addresses to price feeds
  // This would be loaded from config file in production
  
  // For wstETH/USD
  if (tokenAddress.toHexString() == "0x2e8880cAdC08E9B438c6052F5ce3869FBd6cE513" && pair == "usd") {
    return Bytes.fromHexString(WSTETH_USD_FEED);
  }
  
  // For stETH/USD
  if (tokenAddress.toHexString() == "0x5FbDB2315678afecb367f032d93F642f64180aa3" && pair == "usd") {
    return Bytes.fromHexString(STETH_USD_FEED);
  }
  
  // For stETH/ETH
  if (tokenAddress.toHexString() == "0x5FbDB2315678afecb367f032d93F642f64180aa3" && pair == "eth") {
    return Bytes.fromHexString(STETH_ETH_FEED);
  }
  
  return null;
}

/**
 * Get price feed decimals
 */
export function getPriceFeedDecimals(): i32 {
  return PRICE_FEED_DECIMALS;
}


 * Loads from config/marks-config.json (can be updated via GitHub)
 */

import { BigDecimal, Bytes } from "@graphprotocol/graph-ts";

// Default configuration (fallback if config file not available)
const DEFAULT_HA_TOKEN_MULTIPLIER = BigDecimal.fromString("1.0");
const DEFAULT_STABILITY_POOL_MULTIPLIER = BigDecimal.fromString("1.0");

// Price feed addresses (from bcinfo.local.json)
const WSTETH_USD_FEED = "0xeC827421505972a2AE9C320302d3573B42363C26";
const STETH_USD_FEED = "0xb007167714e2940013ec3bb551584130b7497e22";
const STETH_ETH_FEED = "0x6b39b761b1b64c8c095bf0e3bb0c6a74705b4788";

// Price feed decimals (Chainlink uses 8 decimals)
const PRICE_FEED_DECIMALS = 8;

/**
 * Get multiplier for ha token
 * Loads from config/marks-config.json (GitHub-controlled)
 * Falls back to default if config not available
 */
export function getHaTokenMultiplier(tokenAddress: Bytes): BigDecimal {
  // In production, this would load from config/marks-config.json
  // For now, using default - config file can be loaded at build time or via IPFS
  // The config file structure:
  // {
  //   "multipliers": {
  //     "haToken": {
  //       "default": 1.0,
  //       "perToken": {
  //         "0x...": 2.0  // per-token override
  //       }
  //     }
  //   }
  // }
  
  // TODO: Implement config file loading
  // Option 1: Load at build time and embed in subgraph
  // Option 2: Load from IPFS/GitHub at runtime (requires HTTP calls)
  // Option 3: Store config in subgraph entities (updated via admin events)
  
  return DEFAULT_HA_TOKEN_MULTIPLIER;
}

/**
 * Get multiplier for stability pool
 * Loads from config/marks-config.json (GitHub-controlled)
 */
export function getStabilityPoolMultiplier(
  poolAddress: Bytes,
  poolType: string
): BigDecimal {
  // In production, this would load from config/marks-config.json
  // The config file structure:
  // {
  //   "multipliers": {
  //     "stabilityPoolCollateral": {
  //       "default": 1.0,
  //       "perPool": {
  //         "0x...": 1.5  // per-pool override
  //       }
  //     },
  //     "stabilityPoolSail": {
  //       "default": 1.0,
  //       "perPool": {}
  //     }
  //   }
  // }
  
  // TODO: Implement config file loading (same as getHaTokenMultiplier)
  return DEFAULT_STABILITY_POOL_MULTIPLIER;
}

/**
 * Get price feed address for a token
 */
export function getPriceFeedAddress(tokenAddress: Bytes, pair: string): Bytes | null {
  // Map token addresses to price feeds
  // This would be loaded from config file in production
  
  // For wstETH/USD
  if (tokenAddress.toHexString() == "0x2e8880cAdC08E9B438c6052F5ce3869FBd6cE513" && pair == "usd") {
    return Bytes.fromHexString(WSTETH_USD_FEED);
  }
  
  // For stETH/USD
  if (tokenAddress.toHexString() == "0x5FbDB2315678afecb367f032d93F642f64180aa3" && pair == "usd") {
    return Bytes.fromHexString(STETH_USD_FEED);
  }
  
  // For stETH/ETH
  if (tokenAddress.toHexString() == "0x5FbDB2315678afecb367f032d93F642f64180aa3" && pair == "eth") {
    return Bytes.fromHexString(STETH_ETH_FEED);
  }
  
  return null;
}

/**
 * Get price feed decimals
 */
export function getPriceFeedDecimals(): i32 {
  return PRICE_FEED_DECIMALS;
}

