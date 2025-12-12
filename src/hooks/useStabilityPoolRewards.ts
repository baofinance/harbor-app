import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";
import { shouldUseAnvil } from "@/config/environment";
import { publicClient as anvilPublicClient } from "@/config/rpc";

export interface RewardTokenData {
  address: `0x${string}`;
  symbol: string;
  claimable: bigint;
  claimableFormatted: string;
  claimableUSD: number;
  apr: number;
  rewardData?: {
    lastUpdate: bigint;
    finishAt: bigint;
    rate: bigint;
    queued: bigint;
  };
}

export interface StabilityPoolRewards {
  claimableValue: number;
  apr: number;
  rewardTokens: RewardTokenData[];
  loading: boolean;
}

interface UseStabilityPoolRewardsParams {
  poolAddress: `0x${string}` | undefined;
  depositTokenPrice: number; // USD price of deposit token (ha token)
  tokenPriceMap?: Map<string, number>; // token address -> USD price
  enabled?: boolean;
}

export function useStabilityPoolRewards({
  poolAddress,
  depositTokenPrice,
  tokenPriceMap = new Map(),
  enabled = true,
}: UseStabilityPoolRewardsParams): StabilityPoolRewards {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: [
      "stability-pool-rewards",
      poolAddress,
      address,
      depositTokenPrice,
      tokenPriceMap,
    ],
    queryFn: async () => {
      if (!poolAddress || !address || !publicClient) {
        return {
          claimableValue: 0,
          apr: 0,
          rewardTokens: [],
          loading: false,
        };
      }

      const client = shouldUseAnvil() ? anvilPublicClient : publicClient;
      if (!client) {
        return {
          claimableValue: 0,
          apr: 0,
          rewardTokens: [],
          loading: false,
        };
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
          return {
            claimableValue: 0,
            apr: 0,
            rewardTokens: [],
            loading: false,
          };
        }

        // Get total pool supply for APR calculation
        const totalSupply = (await client.readContract({
          address: poolAddress,
          abi: stabilityPoolABI,
          functionName: "totalAssetSupply",
          args: [],
        })) as bigint;

        // Get user balance for APR calculation
        const userBalance = (await client.readContract({
          address: poolAddress,
          abi: stabilityPoolABI,
          functionName: "assetBalanceOf",
          args: [address],
        })) as bigint;

        // Fetch data for each reward token
        const rewardTokensData = await Promise.all(
          rewardTokenAddresses.map(async (tokenAddress) => {
            try {
              // Get claimable amount
              const claimable = (await client.readContract({
                address: poolAddress,
                abi: stabilityPoolABI,
                functionName: "claimable",
                args: [address, tokenAddress],
              })) as bigint;

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
                console.debug(`Could not fetch symbol for ${tokenAddress}:`, e);
              }

              // Get reward data for APR calculation
              let rewardData:
                | {
                    lastUpdate: bigint;
                    finishAt: bigint;
                    rate: bigint;
                    queued: bigint;
                  }
                | undefined;
              try {
                const [lastUpdate, finishAt, rate, queued] =
                  (await client.readContract({
                    address: poolAddress,
                    abi: stabilityPoolABI,
                    functionName: "rewardData",
                    args: [tokenAddress],
                  })) as [bigint, bigint, bigint, bigint];

                rewardData = { lastUpdate, finishAt, rate, queued };
              } catch (e) {
                console.debug(
                  `Could not fetch reward data for ${tokenAddress}:`,
                  e
                );
              }

              // Calculate USD value
              const price =
                tokenPriceMap.get(tokenAddress.toLowerCase()) || 0;
              const claimableFormatted = formatEther(claimable);
              const claimableUSD = parseFloat(claimableFormatted) * price;

              // Calculate APR
              let apr = 0;
              if (
                rewardData &&
                rewardData.rate > 0n &&
                totalSupply > 0n &&
                userBalance > 0n
              ) {
                const ratePerSecond = rewardData.rate;
                const ratePerTokenPerSecond =
                  Number(ratePerSecond) / Number(totalSupply);

                const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                const annualRewards =
                  ratePerTokenPerSecond *
                  Number(userBalance) *
                  SECONDS_PER_YEAR;

                const userDepositValueUSD =
                  (Number(userBalance) * depositTokenPrice) / 1e18;
                const annualRewardsValueUSD = (annualRewards * price) / 1e18;

                if (userDepositValueUSD > 0) {
                  apr = (annualRewardsValueUSD / userDepositValueUSD) * 100;
                }
              }

              return {
                address: tokenAddress,
                symbol,
                claimable,
                claimableFormatted,
                claimableUSD,
                apr,
                rewardData,
              };
            } catch (error) {
              console.error(
                `Error fetching reward data for token ${tokenAddress}:`,
                error
              );
              return null;
            }
          })
        );

        // Filter out null results
        const validRewardTokens = rewardTokensData.filter(
          (token): token is RewardTokenData => token !== null
        );

        // Calculate totals
        const claimableValue = validRewardTokens.reduce(
          (sum, token) => sum + token.claimableUSD,
          0
        );
        const apr = validRewardTokens.reduce((sum, token) => sum + token.apr, 0);

        return {
          claimableValue,
          apr,
          rewardTokens: validRewardTokens,
          loading: false,
        };
      } catch (error) {
        console.error("Error fetching stability pool rewards:", error);
        return {
          claimableValue: 0,
          apr: 0,
          rewardTokens: [],
          loading: false,
        };
      }
    },
    enabled:
      enabled && !!poolAddress && !!address && !!publicClient && depositTokenPrice > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  });

  return (
    query.data ?? {
      claimableValue: 0,
      apr: 0,
      rewardTokens: [],
      loading: true,
    }
  );
}

