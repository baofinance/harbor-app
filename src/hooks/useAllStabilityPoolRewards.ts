import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { formatEther } from "viem";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";
import { getPriceFeedAddress, queryChainlinkPrice } from "@/utils/priceFeeds";

export interface PoolRewards {
  poolAddress: `0x${string}`;
  poolType: "collateral" | "sail";
  marketId: string;
  claimableValue: number;
  rewardTokens: Array<{
    address: `0x${string}`;
    symbol: string;
    claimable: bigint;
    claimableUSD: number;
  }>;
  totalRewardAPR: number; // APR from all reward tokens combined
  totalAPR: number; // Alias for totalRewardAPR for compatibility
  tvl: bigint; // Total Value Locked in the pool
  rewardTokenAPRs: Array<{
    tokenAddress: `0x${string}`;
    symbol: string;
    apr: number;
  }>;
}

interface UseAllStabilityPoolRewardsParams {
  pools: Array<{
    address: `0x${string}`;
    poolType: "collateral" | "sail";
    marketId: string;
    peggedTokenPrice: bigint | undefined; // pegged token price in underlying asset units (18 decimals), e.g., 1e18 = 1 ETH
    collateralPrice: bigint | undefined; // collateral price from oracle
    collateralPriceDecimals: number | undefined;
    peggedTokenAddress: `0x${string}` | undefined;
    collateralTokenAddress: `0x${string}` | undefined;
  }>;
  tokenPriceMap?: Map<string, number>; // Map of token address (lowercase) -> price in USD
  ethPrice?: number | null; // ETH price in USD (for calculating haETH USD price)
  btcPrice?: number | null; // BTC price in USD (for calculating haBTC USD price)
  peggedPriceUSDMap?: Record<string, bigint | undefined>; // Map of marketId -> pegged token USD price (18 decimals)
  enabled?: boolean;
  overrideAddress?: `0x${string}`; // Optional address to override useAccount (useful for transparency page)
}

export function useAllStabilityPoolRewards({
  pools,
  tokenPriceMap,
  ethPrice,
  btcPrice,
  peggedPriceUSDMap,
  enabled = true,
  overrideAddress,
}: UseAllStabilityPoolRewardsParams) {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient();
  // Use overrideAddress if provided, otherwise use accountAddress
  const address = overrideAddress ?? accountAddress;

  // Create serializable version of pools for queryKey (convert BigInt to string)
  const serializablePools = useMemo(() => {
    return pools.map((pool) => ({
      address: pool.address,
      poolType: pool.poolType,
      marketId: pool.marketId,
      peggedTokenPrice: pool.peggedTokenPrice?.toString() ?? null,
      collateralPrice: pool.collateralPrice?.toString() ?? null,
      collateralPriceDecimals: pool.collateralPriceDecimals ?? null,
      peggedTokenAddress: pool.peggedTokenAddress ?? null,
      collateralTokenAddress: pool.collateralTokenAddress ?? null,
    }));
  }, [pools]);

  return useQuery({
    queryKey: ["all-stability-pool-rewards", serializablePools, address, overrideAddress ? "override" : "account"],
    queryFn: async () => {
      if (!address || !publicClient || pools.length === 0) {
        return [];
      }

      const client = false ? publicClient : publicClient;
      if (!client) {
        return [];
      }

      // Debug: log prices received
      if (process.env.NODE_ENV === "development") {
        console.log("[useAllStabilityPoolRewards] Starting calculation", {
          poolsCount: pools.length,
          ethPrice,
          btcPrice,
          pools: pools.map(p => ({ 
            marketId: p.marketId, 
            poolType: p.poolType, 
            address: p.address,
            peggedTokenPrice: p.peggedTokenPrice?.toString(),
            peggedTokenAddress: p.peggedTokenAddress,
          })),
        });
      }

      const results: PoolRewards[] = [];

      // Process each pool
      for (const pool of pools) {
        try {
          // Get active reward tokens
          const rewardTokenAddresses = (await client.readContract({
            address: pool.address,
            abi: stabilityPoolABI,
            functionName: "activeRewardTokens",
            args: [],
          })) as `0x${string}`[];

          if (!rewardTokenAddresses || rewardTokenAddresses.length === 0) {
            // Still fetch TVL even if no reward tokens
            let poolTVL = 0n;
            try {
              poolTVL = (await client.readContract({
                address: pool.address,
                abi: stabilityPoolABI,
                functionName: "totalAssetSupply",
                args: [],
              })) as bigint;
            } catch (e) {
              // TVL fetch failed
            }
            
            results.push({
              poolAddress: pool.address,
              poolType: pool.poolType,
              marketId: pool.marketId,
              claimableValue: 0,
              rewardTokens: [],
              totalRewardAPR: 0,
              totalAPR: 0,
              tvl: poolTVL,
              rewardTokenAPRs: [],
            });
            continue;
          }

          // Get pool TVL for APR calculation
          const poolTVL = (await client.readContract({
            address: pool.address,
            abi: stabilityPoolABI,
            functionName: "totalAssetSupply",
            args: [],
          })) as bigint;

          // Fetch claimable amounts, prices, and reward data for each reward token
          const rewardTokensData = await Promise.all(
            rewardTokenAddresses.map(async (tokenAddress) => {
              try {
                // Get claimable amount
                const claimable = (await client.readContract({
                  address: pool.address,
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
                  // Symbol fetch failed, use address
                }

                // Get reward data for APR calculation
                let rewardData: { rate: bigint } | undefined;
                try {
                  const [lastUpdate, finishAt, rate, queued] =
                    (await client.readContract({
                      address: pool.address,
                      abi: stabilityPoolABI,
                      functionName: "rewardData",
                      args: [tokenAddress],
                    })) as [bigint, bigint, bigint, bigint];
                  rewardData = { rate };
                } catch (e) {
                  // Reward data fetch failed
                }

                // Determine price based on token address
                let price = 0;
                const tokenAddressLower = tokenAddress.toLowerCase();
                let priceSource = "none";
                
                // Check if it's the pegged token
                if (
                  pool.peggedTokenAddress &&
                  tokenAddressLower === pool.peggedTokenAddress.toLowerCase()
                ) {
                  // Use pegged token price
                  if (pool.peggedTokenPrice) {
                    price = Number(pool.peggedTokenPrice) / 1e18;
                    priceSource = "pegged";
                  }
                }
                // Check if it's the collateral token
                else if (
                  pool.collateralTokenAddress &&
                  tokenAddressLower === pool.collateralTokenAddress.toLowerCase()
                ) {
                  // Use collateral price
                  if (
                    pool.collateralPrice &&
                    pool.collateralPriceDecimals !== undefined
                  ) {
                    price =
                      Number(pool.collateralPrice) /
                      10 ** pool.collateralPriceDecimals;
                    priceSource = "collateral";
                  }
                }
                // Check token price map for other tokens (e.g., wstETH)
                else if (tokenPriceMap) {
                  const mappedPrice = tokenPriceMap.get(tokenAddressLower);
                  if (mappedPrice !== undefined) {
                    price = mappedPrice;
                    priceSource = "tokenPriceMap";
                  }
                }
                
                // If still no price, try querying Chainlink price feed
                if (price === 0) {
                  const priceFeedAddress = getPriceFeedAddress(tokenAddress);
                  if (priceFeedAddress && client) {
                    try {
                      const chainlinkPrice = await queryChainlinkPrice(priceFeedAddress, client);
                      if (chainlinkPrice) {
                        price = chainlinkPrice.price;
                        priceSource = "chainlink";
                      }
                    } catch (e) {
                      // Failed to query Chainlink price feed
                    }
                  }
                }

                // If still no price, leave it as 0 (don't assume pegged price)
                // This ensures we don't show incorrect USD values for unknown tokens

                // Debug: log price lookup
                if (process.env.NODE_ENV === "development") {
                  console.log("[Reward Token Price Lookup]", {
                    marketId: pool.marketId,
                    poolType: pool.poolType,
                    rewardTokenAddress: tokenAddress,
                    rewardTokenSymbol: symbol,
                    price,
                    priceSource,
                    fromTokenPriceMap: tokenPriceMap?.get(tokenAddressLower),
                    peggedTokenAddress: pool.peggedTokenAddress,
                    collateralTokenAddress: pool.collateralTokenAddress,
                    isPeggedToken: pool.peggedTokenAddress && tokenAddressLower === pool.peggedTokenAddress.toLowerCase(),
                    isCollateralToken: pool.collateralTokenAddress && tokenAddressLower === pool.collateralTokenAddress.toLowerCase(),
                  });
                }

                // Calculate USD value
                const claimableFormatted = formatEther(claimable);
                const claimableUSD = parseFloat(claimableFormatted) * price;

                // Calculate APR from reward rate
                // Only calculate APR if we have a valid price for the reward token
                let apr = 0;
                
                // Debug: log even if conditions aren't met
                if (process.env.NODE_ENV === "development") {
                  if (!rewardData || rewardData.rate === 0n || poolTVL === 0n || price === 0) {
                    console.log("[APR Calculation SKIPPED]", {
                      marketId: pool.marketId,
                      poolType: pool.poolType,
                      poolAddress: pool.address,
                      rewardToken: symbol,
                      hasRewardData: !!rewardData,
                      rewardRate: rewardData?.rate?.toString() || "0",
                      poolTVL: poolTVL?.toString() || "0",
                      rewardTokenPrice: price,
                      ethPrice,
                      btcPrice,
                    });
                  }
                }
                
                if (rewardData && rewardData.rate > 0n && poolTVL > 0n && price > 0) {
                  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                  
                  // rewardData.rate is in wei per second for the entire pool
                  // Convert to annual rewards in tokens (divide by 1e18)
                  const annualRewardsTokens = (Number(rewardData.rate) * SECONDS_PER_YEAR) / 1e18;
                  
                  // Calculate USD values
                  // Prefer peggedPriceUSDMap (already calculated correctly in USD)
                  // Otherwise, calculate from peggedTokenPrice (in underlying asset units) * underlyingAssetUSD
                  let depositTokenPriceUSD = 0;
                  let isBTCPegged = false;
                  let isETHPegged = false;
                  
                  // First, try peggedPriceUSDMap (most accurate - already in USD, 18 decimals)
                  if (peggedPriceUSDMap && peggedPriceUSDMap[pool.marketId]) {
                    depositTokenPriceUSD = Number(peggedPriceUSDMap[pool.marketId]) / 1e18;
                    if (process.env.NODE_ENV === "development") {
                      console.log("[APR USD Price from peggedPriceUSDMap]", {
                        marketId: pool.marketId,
                        peggedPriceUSD: depositTokenPriceUSD,
                      });
                    }
                  }
                  
                  // Fallback: calculate from peggedTokenPrice * underlyingAssetUSD
                  if (depositTokenPriceUSD === 0 && pool.peggedTokenPrice && (ethPrice || btcPrice)) {
                    const peggedTokenPriceInUnderlying = Number(pool.peggedTokenPrice) / 1e18;
                    
                    // Determine underlying asset from marketId (e.g., "eth-fxusd" = ETH, "btc-steth" = BTC)
                    const marketIdLower = pool.marketId.toLowerCase();
                    isBTCPegged = marketIdLower.includes("btc") || marketIdLower.includes("bitcoin");
                    isETHPegged = marketIdLower.includes("eth") || marketIdLower.includes("ethereum") || (!isBTCPegged && ethPrice);
                    
                    // Calculate USD price: peggedTokenPrice (in underlying) * underlyingAssetUSD
                    if (isBTCPegged && btcPrice && btcPrice > 0) {
                      depositTokenPriceUSD = peggedTokenPriceInUnderlying * btcPrice;
                    } else if (isETHPegged && ethPrice && ethPrice > 0) {
                      depositTokenPriceUSD = peggedTokenPriceInUnderlying * ethPrice;
                    }
                    
                    if (process.env.NODE_ENV === "development") {
                      console.log("[APR USD Price Calculation]", {
                        marketId: pool.marketId,
                        peggedTokenPriceRaw: pool.peggedTokenPrice.toString(),
                        peggedTokenPriceInUnderlying,
                        isBTCPegged,
                        isETHPegged,
                        btcPrice,
                        ethPrice,
                        calculatedUSDPrice: depositTokenPriceUSD,
                      });
                    }
                  }
                  
                  // Fallback: try tokenPriceMap (should have USD prices if available)
                  if (depositTokenPriceUSD === 0 && pool.peggedTokenAddress && tokenPriceMap) {
                    const mappedPrice = tokenPriceMap.get(pool.peggedTokenAddress.toLowerCase());
                    if (mappedPrice !== undefined && mappedPrice > 0 && mappedPrice > 100) {
                      // Price > 100 is likely already in USD (ETH/BTC are $3k-$90k)
                      depositTokenPriceUSD = mappedPrice;
                      if (process.env.NODE_ENV === "development") {
                        console.log("[APR USD Price from tokenPriceMap]", {
                          marketId: pool.marketId,
                          peggedTokenAddress: pool.peggedTokenAddress,
                          mappedPrice,
                        });
                      }
                    }
                  }
                  
                  // Final fallback: use $1 if no price available
                  if (depositTokenPriceUSD === 0) {
                    depositTokenPriceUSD = 1;
                    if (process.env.NODE_ENV === "development") {
                      console.warn("[APR USD Price FALLBACK to $1]", {
                        marketId: pool.marketId,
                        peggedTokenPrice: pool.peggedTokenPrice?.toString(),
                        peggedPriceUSDMap: peggedPriceUSDMap?.[pool.marketId]?.toString(),
                        ethPrice,
                        btcPrice,
                      });
                    }
                  }
                  
                  // Annual rewards value in USD (reward token price * annual rewards in tokens)
                  const annualRewardsValueUSD = annualRewardsTokens * price;
                  
                  // Deposit value in USD (poolTVL is in wei, convert to tokens then multiply by USD price)
                  const depositValueUSD = (Number(poolTVL) / 1e18) * depositTokenPriceUSD;

                  if (depositValueUSD > 0) {
                    apr = (annualRewardsValueUSD / depositValueUSD) * 100;
                  }
                  
                  // Debug logging for APR calculation (always log for now to debug BTC issue)
                  if (process.env.NODE_ENV === "development") {
                    console.log("[APR Calculation]", {
                      marketId: pool.marketId,
                      poolType: pool.poolType,
                      poolAddress: pool.address,
                      rewardToken: symbol,
                      rewardRate: rewardData.rate.toString(),
                      rewardRatePerYear: (Number(rewardData.rate) * SECONDS_PER_YEAR).toString(),
                      poolTVL: poolTVL.toString(),
                      poolTVLTokens: (Number(poolTVL) / 1e18).toFixed(6),
                      annualRewardsTokens: annualRewardsTokens.toFixed(6),
                      rewardTokenPriceUSD: price,
                      annualRewardsValueUSD: annualRewardsValueUSD.toFixed(2),
                      peggedTokenPriceRaw: pool.peggedTokenPrice?.toString(),
                      peggedTokenPriceInUnderlying: pool.peggedTokenPrice ? Number(pool.peggedTokenPrice) / 1e18 : 0,
                      underlyingAssetUSD: isBTCPegged ? btcPrice : isETHPegged ? ethPrice : "unknown",
                      depositTokenPriceUSD: depositTokenPriceUSD.toFixed(2),
                      depositValueUSD: depositValueUSD.toFixed(2),
                      calculatedAPR: apr.toFixed(2) + "%",
                    });
                  }
                }

                return {
                  address: tokenAddress,
                  symbol,
                  claimable,
                  claimableUSD,
                  apr,
                };
              } catch (e) {
                return {
                  address: tokenAddress,
                  symbol: "UNKNOWN",
                  claimable: 0n,
                  claimableUSD: 0,
                  apr: 0,
                };
              }
            })
          );

          // Calculate total claimable value for this pool
          const claimableValue = rewardTokensData.reduce(
            (sum, token) => sum + token.claimableUSD,
            0
          );

          // Calculate total APR from all reward tokens
          const totalRewardAPR = rewardTokensData.reduce(
            (sum, token) => sum + (token.apr || 0),
            0
          );

          // Get reward token APR details
          const rewardTokenAPRs = rewardTokensData
            .filter((token) => token.apr > 0)
            .map((token) => ({
              tokenAddress: token.address,
              symbol: token.symbol,
              apr: token.apr,
            }));

          results.push({
            poolAddress: pool.address,
            poolType: pool.poolType,
            marketId: pool.marketId,
            claimableValue,
            rewardTokens: rewardTokensData
              .filter((token) => token.claimable > 0n)
              .map(({ apr, ...rest }) => rest), // Remove apr from rewardTokens array
            totalRewardAPR,
            totalAPR: totalRewardAPR, // Alias for compatibility
            tvl: poolTVL, // Include TVL for display
            rewardTokenAPRs,
          });
        } catch (e) {
          // Pool query failed, add empty result
          results.push({
            poolAddress: pool.address,
            poolType: pool.poolType,
            marketId: pool.marketId,
            claimableValue: 0,
            rewardTokens: [],
            totalRewardAPR: 0,
            totalAPR: 0,
            tvl: 0n,
            rewardTokenAPRs: [],
          });
        }
      }

      return results;
    },
    enabled: enabled && !!address && !!publicClient && pools.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

