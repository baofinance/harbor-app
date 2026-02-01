/**
 * Chainlink price feed configuration (Ethereum mainnet)
 * Used for fallback when CoinGecko is unavailable
 */

/** Chainlink aggregator addresses for common USD pairs */
export const CHAINLINK_FEEDS = {
  ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`,
  EUR_USD: "0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353" as `0x${string}`,
} as const;

/** Harbor reward token addresses (mainnet) - used for APR fallback */
export const REWARD_TOKEN_ADDRESSES = {
  FXSAVE: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39" as `0x${string}`,
  WSTETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as `0x${string}`,
  STETH: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84" as `0x${string}`,
} as const;

/** Scale Chainlink answer to 18-decimal USD wei */
export function scaleChainlinkToUsdWei(answer: bigint, decimals: number): bigint {
  if (answer <= 0n) return 0n;
  if (decimals === 18) return answer;
  if (decimals < 18) return answer * 10n ** BigInt(18 - decimals);
  return answer / 10n ** BigInt(decimals - 18);
}
