/**
 * Chainlink price feed configuration (Ethereum mainnet)
 * Used for fallback when CoinGecko is unavailable
 */

/** Chainlink aggregator addresses for common USD pairs */
export const CHAINLINK_FEEDS = {
  ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`,
  /** Standard Chainlink EUR/USD: returns USD per EUR (e.g. 118123500 = 1.181235) */
  EUR_USD: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1" as `0x${string}`,
  /** XAU/USD (Gold): returns USD per troy oz, 8 decimals */
  XAU_USD: "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6" as `0x${string}`,
  /** XAG/USD (Silver): returns USD per troy oz, 8 decimals */
  XAG_USD: "0x379589227b15F1a12195D3f2d90bBc9F31f95235" as `0x${string}`,
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
