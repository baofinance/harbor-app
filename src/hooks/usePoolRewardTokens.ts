import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";
import { shouldUseAnvil } from "@/config/environment";
import { anvilPublicClient } from "@/config/anvil";

export interface RewardTokenInfo {
  address: `0x${string}`;
  symbol: string;
  name?: string; // Full token name for tooltip
  displayName: string; // Best available name for display (symbol > name > truncated address)
}

interface UsePoolRewardTokensParams {
  poolAddress: `0x${string}` | undefined;
  enabled?: boolean;
}

/**
 * Truncate an address for display (e.g., "0x1234...5678")
 */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function usePoolRewardTokens({
  poolAddress,
  enabled = true,
}: UsePoolRewardTokensParams) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["pool-reward-tokens", poolAddress],
    queryFn: async () => {
      if (!poolAddress || !publicClient) {
        return [];
      }

      const client = shouldUseAnvil() ? anvilPublicClient : publicClient;
      if (!client) {
        return [];
      }

      try {
        // Get active reward tokens
        const rewardTokenAddresses = (await client.readContract({
          address: poolAddress,
          abi: stabilityPoolABI,
          functionName: "activeRewardTokens",
          args: [],
        })) as `0x${string}`[];

        if (!rewardTokenAddresses || rewardTokenAddresses.length === 0) {
          return [];
        }

        // Fetch symbol and name for each token
        const rewardTokens = await Promise.all(
          rewardTokenAddresses.map(async (tokenAddress) => {
            let symbol: string | undefined;
            let name: string | undefined;

            // Try to fetch symbol
            try {
              symbol = (await client.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: "symbol",
                args: [],
              })) as string;
            } catch {
              // Symbol fetch failed, will try name
            }

            // Try to fetch name (useful for tooltip and fallback)
            try {
              name = (await client.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: "name",
                args: [],
              })) as string;
            } catch {
              // Name fetch failed
            }

            // Determine the best display name:
            // 1. Use symbol if available and valid
            // 2. Fall back to name if symbol unavailable
            // 3. Fall back to truncated address as last resort
            const hasValidSymbol = symbol && symbol.length > 0 && symbol !== "UNKNOWN";
            const hasValidName = name && name.length > 0;
            
            let displayName: string;
            if (hasValidSymbol) {
              displayName = symbol;
            } else if (hasValidName) {
              displayName = name;
            } else {
              displayName = truncateAddress(tokenAddress);
            }

            return {
              address: tokenAddress,
              symbol: symbol || truncateAddress(tokenAddress),
              name: name,
              displayName,
            };
          })
        );

        return rewardTokens;
      } catch (error) {
        return [];
      }
    },
    enabled: enabled && !!poolAddress && !!publicClient,
    refetchInterval: 60000, // Refresh every 60 seconds (reward tokens don't change often)
    retry: 2,
  });
}
