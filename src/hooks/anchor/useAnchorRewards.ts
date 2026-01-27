import { useMemo } from "react";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";
import { calculateReadOffset, calculatePriceOracleOffset } from "@/utils/anchor/calculateReadOffset";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";

/**
 * Hook to calculate and aggregate all pool rewards for anchor markets
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param reads - Contract read results
 * @returns Pool rewards map and loading state
 */
export function useAnchorRewards(
  anchorMarkets: Array<[string, any]>,
  reads: any,
  ethPrice?: number | null,
  btcPrice?: number | null,
  peggedPriceUSDMap?: Record<string, bigint | undefined>
) {
  // Reward token USD prices (used to compute claimableValue + APR)
  const { price: fxSAVEPriceUSD } = useCoinGeckoPrice("fx-usd-saving");
  const { price: wstETHPriceUSD } = useCoinGeckoPrice("wrapped-steth");
  const { price: stETHPriceUSD } = useCoinGeckoPrice("lido-staked-ethereum-steth");

  // Build pools array for useAllStabilityPoolRewards
  const allPoolsForRewards = useMemo(() => {
    if (!reads) return [];

    const pools: Array<{
      address: `0x${string}`;
      poolType: "collateral" | "sail";
      marketId: string;
      peggedTokenPrice: bigint | undefined;
      collateralPrice: bigint | undefined;
      collateralPriceDecimals: number | undefined;
      peggedTokenAddress: `0x${string}` | undefined;
      collateralTokenAddress: `0x${string}` | undefined;
    }> = [];

    anchorMarkets.forEach(([id, m], mi) => {
      const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
      const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
      const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
      const hasStabilityPoolManager = !!(m as any).addresses
        ?.stabilityPoolManager;

      // Calculate offset for this market using utility function
      const baseOffset = calculateReadOffset(anchorMarkets, mi);
      const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
        | bigint
        | undefined;
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      const collateralTokenAddress = (m as any).collateral?.address as
        | `0x${string}`
        | undefined;

      // Get collateral price and decimals
      let collateralPrice: bigint | undefined;
      // IWrappedPriceOracle always returns prices in 18 decimals
      const collateralPriceDecimals: number = 18;
      if (hasPriceOracle) {
        const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, mi);
        // latestAnswer returns a tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
        // Use maxUnderlyingPrice (index 1) as the price
        // Handle both array format and object format (viem can return either)
        const latestAnswerResult = reads?.[priceOracleOffset]?.result;
        if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          if (Array.isArray(latestAnswerResult)) {
            collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice is at index 1
          } else if (typeof latestAnswerResult === "object") {
            // Handle named tuple object format
            const objResult = latestAnswerResult as {
              maxUnderlyingPrice?: bigint;
              [key: string]: unknown;
            };
            if (objResult.maxUnderlyingPrice !== undefined) {
              collateralPrice = objResult.maxUnderlyingPrice;
            }
          } else if (typeof latestAnswerResult === "bigint") {
            // Single value format (standard Chainlink)
            collateralPrice = latestAnswerResult;
          }
        }
      }

      const currentOffset = baseOffset + 5 + (hasStabilityPoolManager ? 1 : 0);

      if (hasCollateralPool) {
        const collateralPoolAddress = (m as any).addresses
          ?.stabilityPoolCollateral as `0x${string}`;
        pools.push({
          address: collateralPoolAddress,
          poolType: "collateral",
          marketId: id,
          peggedTokenPrice,
          collateralPrice,
          collateralPriceDecimals,
          peggedTokenAddress,
          collateralTokenAddress,
        });
      }

      if (hasSailPool) {
        const sailPoolAddress = (m as any).addresses
          ?.stabilityPoolLeveraged as `0x${string}`;
        pools.push({
          address: sailPoolAddress,
          poolType: "sail",
          marketId: id,
          peggedTokenPrice,
          collateralPrice,
          collateralPriceDecimals,
          peggedTokenAddress,
          collateralTokenAddress,
        });
      }
    });

    return pools;
  }, [anchorMarkets, reads]);

  // Build global token price map for all reward tokens
  const globalTokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();

    // Iterate through all markets to collect token prices
    anchorMarkets.forEach(([id, m], mi) => {
      const hasPriceOracle = !!(m as any).addresses?.collateralPrice;

      // Calculate offset for this market using utility function
      const baseOffset = calculateReadOffset(anchorMarkets, mi);
      const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
        | bigint
        | undefined;
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      const collateralTokenAddress = (m as any).addresses?.collateralToken as
        | `0x${string}`
        | undefined;

      // Add pegged token price
      if (peggedTokenAddress && peggedTokenPrice) {
        const price = Number(peggedTokenPrice) / 1e18;
        map.set(peggedTokenAddress.toLowerCase(), price);
      }

      // Add wrapped collateral token price (reward tokens commonly include wrapped collateral, e.g. fxSAVE / wstETH)
      const wrappedCollateralTokenAddress = (m as any).addresses
        ?.wrappedCollateralToken as `0x${string}` | undefined;
      const wrappedSymbol = (m as any).collateral?.symbol?.toLowerCase?.() as
        | string
        | undefined;
      if (wrappedCollateralTokenAddress) {
        let p: number | undefined;
        if (wrappedSymbol === "fxsave") p = fxSAVEPriceUSD ?? undefined;
        else if (wrappedSymbol === "wsteth") {
          p = wstETHPriceUSD ?? undefined;
          // Fallback: calculate wstETH USD price from wrappedRate * ETH price
          if ((!p || p === 0 || p < 100) && ethPrice && ethPrice > 0) {
            const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, mi);
            const latestAnswerResult = reads?.[priceOracleOffset]?.result;
            if (latestAnswerResult && Array.isArray(latestAnswerResult)) {
              const wrappedRate = latestAnswerResult[3] as bigint; // maxWrappedRate
              if (wrappedRate && wrappedRate > 0n) {
                const wrappedRateNum = Number(wrappedRate) / 1e18;
                p = wrappedRateNum * ethPrice;
                console.log("[useAnchorRewards] Calculated wstETH USD price from wrappedRate * ETH:", {
                  marketId: id,
                  wrappedRate: wrappedRateNum,
                  ethPrice,
                  calculatedPrice: p,
                });
              }
            }
          }
        }
        else if (wrappedSymbol === "steth") p = stETHPriceUSD ?? undefined;
        if (p && Number.isFinite(p) && p > 0) {
          map.set(wrappedCollateralTokenAddress.toLowerCase(), p);
          if (process.env.NODE_ENV === "development" && wrappedSymbol === "wsteth") {
            console.log("[useAnchorRewards] Added wstETH to globalTokenPriceMap:", {
              address: wrappedCollateralTokenAddress,
              price: p,
              source: wstETHPriceUSD ? "CoinGecko" : "wrappedRate * ETH",
            });
          }
        }
      }

      // Add collateral token price
        if (hasPriceOracle && collateralTokenAddress) {
          const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, mi);
        // IWrappedPriceOracle always returns prices in 18 decimals
        const collateralPriceDecimals = 18;
        // latestAnswer returns a tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
        // Use maxUnderlyingPrice (index 1) as the price
        // Handle both array format and object format (viem can return either)
        const latestAnswerResult = reads?.[priceOracleOffset]?.result;
        let collateralPrice: bigint | undefined;
        if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          if (Array.isArray(latestAnswerResult)) {
            collateralPrice = latestAnswerResult[1] as bigint;
          } else if (typeof latestAnswerResult === "object") {
            const objResult = latestAnswerResult as {
              maxUnderlyingPrice?: bigint;
              [key: string]: unknown;
            };
            if (objResult.maxUnderlyingPrice !== undefined) {
              collateralPrice = objResult.maxUnderlyingPrice;
            }
          } else if (typeof latestAnswerResult === "bigint") {
            collateralPrice = latestAnswerResult;
          }
        }

        if (collateralPrice) {
          const price = Number(collateralPrice) / 10 ** collateralPriceDecimals;
          // Only set if we don't already have a USD price (> $1000)
          const existing = map.get(collateralTokenAddress.toLowerCase());
          if (!existing || existing < 1000) {
            map.set(collateralTokenAddress.toLowerCase(), price);
          }

          // Also add wstETH if it's a different address
          const wstETHAddress = (m as any).addresses?.wstETH as
            | `0x${string}`
            | undefined;
          if (
            wstETHAddress &&
            wstETHAddress.toLowerCase() !== collateralTokenAddress.toLowerCase()
          ) {
            // Only set if we don't already have a USD price (> $1000)
            const existing = map.get(wstETHAddress.toLowerCase());
            if (!existing || existing < 1000) {
              map.set(wstETHAddress.toLowerCase(), price);
            }
          }
        }
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[useAnchorRewards] globalTokenPriceMap built:", {
        size: map.size,
        entries: Array.from(map.entries()).map(([addr, price]) => ({
          address: addr,
          price,
          priceType: typeof price,
          isOver1000: price > 1000,
        })),
      });
    }

    return map;
  }, [
    anchorMarkets,
    reads,
    fxSAVEPriceUSD,
    wstETHPriceUSD,
    stETHPriceUSD,
    ethPrice,
  ]);

  // Fetch all stability pool rewards
  // Debug: log prices being passed
  if (process.env.NODE_ENV === "development") {
    console.log("[useAnchorRewards] Passing prices to useAllStabilityPoolRewards", {
      ethPrice,
      btcPrice,
      poolsCount: allPoolsForRewards.length,
      peggedPriceUSDMap: peggedPriceUSDMap ? Object.keys(peggedPriceUSDMap) : undefined,
      globalTokenPriceMapSize: globalTokenPriceMap.size,
    });
  }
  
  const {
    data: allPoolRewards = [],
    isLoading: isLoadingAllRewards,
    isFetching: isFetchingAllRewards,
    isError: isErrorAllRewards,
    error: allRewardsError,
  } =
    useAllStabilityPoolRewards({
      pools: allPoolsForRewards,
      tokenPriceMap: globalTokenPriceMap,
      ethPrice: ethPrice || null,
      btcPrice: btcPrice || null,
      peggedPriceUSDMap: peggedPriceUSDMap,
      enabled: !!reads && allPoolsForRewards.length > 0,
    });

  // Create a map for quick lookup: poolAddress -> rewards
  const poolRewardsMap = useMemo(() => {
    const map = new Map<`0x${string}`, (typeof allPoolRewards)[0]>();
    allPoolRewards.forEach((poolReward) => {
      map.set(poolReward.poolAddress, poolReward);
    });
    return map;
  }, [allPoolRewards]);

  return {
    allPoolRewards,
    poolRewardsMap,
    isLoadingAllRewards,
    isFetchingAllRewards,
    isErrorAllRewards,
    allRewardsError,
    allPoolsForRewards,
    globalTokenPriceMap,
  };
}

