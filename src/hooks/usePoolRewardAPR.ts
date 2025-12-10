import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { STABILITY_POOL_ABI, ERC20_ABI } from "@/abis/shared";
import { shouldUseAnvil } from "@/config/environment";
import { anvilPublicClient } from "@/config/anvil";

interface UsePoolRewardAPRParams {
  poolAddress: `0x${string}` | undefined;
  poolTVL: bigint | undefined;
  peggedTokenPrice: bigint | undefined; // pegged token price in 18 decimals
  collateralPrice: bigint | undefined; // collateral price from oracle
  collateralPriceDecimals: number | undefined;
  peggedTokenAddress: `0x${string}` | undefined;
  collateralTokenAddress: `0x${string}` | undefined;
  enabled?: boolean;
}

export function usePoolRewardAPR({
  poolAddress,
  poolTVL,
  peggedTokenPrice,
  collateralPrice,
  collateralPriceDecimals,
  peggedTokenAddress,
  collateralTokenAddress,
  enabled = true,
}: UsePoolRewardAPRParams) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: [
      "pool-reward-apr",
      poolAddress,
      poolTVL?.toString(),
      peggedTokenPrice?.toString(),
      collateralPrice?.toString(),
      collateralPriceDecimals,
      peggedTokenAddress,
      collateralTokenAddress,
    ],
    queryFn: async () => {
      if (
        !poolAddress ||
        !poolTVL ||
        poolTVL === 0n ||
        !publicClient ||
        !address
      ) {
        return { totalAPR: 0, rewardTokenAPRs: [] };
      }

      const client = shouldUseAnvil() ? anvilPublicClient : publicClient;
      if (!client) {
        return { totalAPR: 0, rewardTokenAPRs: [] };
      }

      try {
        // Get all active reward tokens
        const rewardTokenAddresses = (await client.readContract({
          address: poolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "activeRewardTokens",
          args: [],
        })) as `0x${string}`[];

        if (!rewardTokenAddresses || rewardTokenAddresses.length === 0) {
          return { totalAPR: 0, rewardTokenAPRs: [] };
        }

        // Fetch reward data and calculate APR for each token
        const rewardTokenAPRs = await Promise.all(
          rewardTokenAddresses.map(async (tokenAddress) => {
            try {
              // Get reward data (rate)
              const [lastUpdate, finishAt, rate, queued] =
                (await client.readContract({
                  address: poolAddress,
          abi: STABILITY_POOL_ABI,
                  functionName: "rewardData",
                  args: [tokenAddress],
                })) as [bigint, bigint, bigint, bigint];

              if (rate === 0n) {
                return {
                  tokenAddress,
                  symbol: "UNKNOWN",
                  apr: 0,
                };
              }

              // Get token symbol
              let symbol = "UNKNOWN";
              try {
                symbol = (await client.readContract({
                  address: tokenAddress,
                  abi: ERC20_ABI,
                  functionName: "symbol",
                  args: [],
                })) as string;
              } catch (e) {
                // Symbol fetch failed
              }

              // Determine token price
              let tokenPrice = 0;
              const tokenAddressLower = tokenAddress.toLowerCase();

              // Check if it's the pegged token
              if (
                peggedTokenAddress &&
                tokenAddressLower === peggedTokenAddress.toLowerCase()
              ) {
                if (peggedTokenPrice) {
                  tokenPrice = Number(peggedTokenPrice) / 1e18;
                }
              }
              // Check if it's the collateral token
              else if (
                collateralTokenAddress &&
                tokenAddressLower === collateralTokenAddress.toLowerCase()
              ) {
                if (collateralPrice && collateralPriceDecimals !== undefined) {
                  tokenPrice =
                    Number(collateralPrice) / 10 ** collateralPriceDecimals;
                }
              }
              // Default: assume it's pegged token if we can't identify
              else if (peggedTokenPrice) {
                tokenPrice = Number(peggedTokenPrice) / 1e18;
              }

              // Calculate APR from reward rate
              const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
              const ratePerTokenPerSecond = Number(rate) / Number(poolTVL);
              const annualRewards =
                ratePerTokenPerSecond * Number(poolTVL) * SECONDS_PER_YEAR;

              // Calculate USD values
              const depositTokenPrice = peggedTokenPrice
                ? Number(peggedTokenPrice) / 1e18
                : 1; // Default to $1 if price unavailable
              const annualRewardsValueUSD = (annualRewards * tokenPrice) / 1e18;
              const depositValueUSD = (Number(poolTVL) * depositTokenPrice) / 1e18;

              let apr = 0;
              if (depositValueUSD > 0) {
                apr = (annualRewardsValueUSD / depositValueUSD) * 100;
              }

              return {
                tokenAddress,
                symbol,
                apr,
                rate: rate.toString(),
                tokenPrice,
              };
            } catch (error) {
              // If we can't fetch reward data for this token, skip it
              return {
                tokenAddress,
                symbol: "UNKNOWN",
                apr: 0,
              };
            }
          })
        );

        // Sum all APR contributions
        const totalAPR = rewardTokenAPRs.reduce(
          (sum, token) => sum + token.apr,
          0
        );

        return {
          totalAPR,
          rewardTokenAPRs: rewardTokenAPRs.filter((token) => token.apr > 0),
        };
      } catch (error) {
        return { totalAPR: 0, rewardTokenAPRs: [] };
      }
    },
    enabled:
      enabled &&
      !!poolAddress &&
      !!poolTVL &&
      poolTVL > 0n &&
      !!publicClient &&
      !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  });
}



