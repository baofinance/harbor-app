/**
 * Price Feed Registry
 * Maps token addresses to their Chainlink price feed addresses
 * This allows us to query prices for any reward token
 */

// Chainlink price feed addresses (from bcinfo.local.json or production Chainlink registry)
// Format: token address (lowercase) -> price feed address
export const PRICE_FEED_REGISTRY: Map<string, `0x${string}`> = new Map([
  // wstETH/USD
  ["0x0165878a594ca255338adfa4d48449f69242eb8f", "0xeC827421505972a2AE9C320302d3573B42363C26"],
  // stETH/USD (if different from wstETH)
  ["0x5fc8d32690cc91d4c39d9d3abcb16989f875707", "0xb007167714e2940013ec3bb551584130b7497e22"],
]);

// Re-export from centralized ABIs
export { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";

/**
 * Get price feed address for a token
 * @param tokenAddress Token address (case-insensitive)
 * @returns Price feed address or null if not found
 */
export function getPriceFeedAddress(tokenAddress: string): `0x${string}` | null {
  const normalized = tokenAddress.toLowerCase();
  return PRICE_FEED_REGISTRY.get(normalized) || null;
}

/**
 * Query price from Chainlink price feed
 * @param priceFeedAddress Chainlink aggregator address
 * @param publicClient Viem public client
 * @returns Price in USD or null if query fails
 */
export async function queryChainlinkPrice(
  priceFeedAddress: `0x${string}`,
  publicClient: any
): Promise<{ price: number; decimals: number } | null> {
  try {
    const [decimals, latestAnswer] = await Promise.all([
      publicClient.readContract({
        address: priceFeedAddress,
        abi: CHAINLINK_AGGREGATOR_ABI,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: priceFeedAddress,
        abi: CHAINLINK_AGGREGATOR_ABI,
        functionName: "latestAnswer",
      }),
    ]);

    // Chainlink prices are typically in 8 decimals
    const price = Number(latestAnswer) / 10 ** Number(decimals);
    return { price, decimals: Number(decimals) };
  } catch (error) {
    return null;
  }
}

