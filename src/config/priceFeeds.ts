/**
 * Mainnet Chainlink price feed and reward token addresses.
 * Single source for Anchor modal, useTokenPrices, useAnchorPrices, landing API, genesis, etc.
 */

export const CHAINLINK_FEEDS = {
  ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`,
  EUR_USD: "0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353" as `0x${string}`,
} as const;

/** Common reward token addresses (mainnet). Used for APR fallback when getAPRBreakdown is unavailable. */
export const REWARD_TOKEN_ADDRESSES = {
  FXSAVE: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39" as `0x${string}`,
  WSTETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as `0x${string}`,
  STETH: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84" as `0x${string}`,
} as const;
