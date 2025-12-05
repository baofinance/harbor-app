import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";
import { shouldUseAnvil } from "@/config/environment";
import { anvilPublicClient } from "@/config/anvil";

export interface RewardTokenInfo {
  address: `0x${string}`;
  symbol: string;
}

interface UsePoolRewardTokensParams {
  poolAddress: `0x${string}` | undefined;
  enabled?: boolean;
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

        // Fetch symbol for each token
        const rewardTokens = await Promise.all(
          rewardTokenAddresses.map(async (tokenAddress) => {
            try {
              const symbol = (await client.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: "symbol",
                args: [],
              })) as string;

              return {
                address: tokenAddress,
                symbol: symbol || "UNKNOWN",
              };
            } catch (error) {
              return {
                address: tokenAddress,
                symbol: "UNKNOWN",
              };
            }
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

