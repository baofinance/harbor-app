import { useMemo } from "react";

export type GroupedMarket = {
  symbol: string;
  markets: Array<{ marketId: string; market: any; marketIndex: number }>;
  bestMarketId: string;
  bestMarket: any;
  bestMarketIndex: number;
  bestPoolType: "collateral" | "sail";
  combinedAPR: number;
  combinedRewardsUSD: number;
  combinedPositionUSD: number;
  collateralSymbol: string;
  hasStabilityPoolDeposits: boolean;
  hasHaTokens: boolean;
};

/**
 * Hook to group markets by peggedToken.symbol and calculate combined stats
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param reads - Contract read results
 * @param marketPositions - Map of marketId -> position data
 * @returns Array of grouped market data or null if reads not available
 */
export function useGroupedMarkets(
  anchorMarkets: Array<[string, any]>,
  reads: any,
  marketPositions: Record<string, any>
): GroupedMarket[] | null {
  return useMemo(() => {
    if (!reads) return null;

    const groups: Record<
      string,
      Array<{
        marketId: string;
        market: any;
        marketIndex: number;
      }>
    > = {};

    anchorMarkets.forEach(([id, m], mi) => {
      const symbol = m.peggedToken?.symbol || "UNKNOWN";
      if (!groups[symbol]) {
        groups[symbol] = [];
      }
      groups[symbol].push({ marketId: id, market: m, marketIndex: mi });
    });

    // Calculate combined stats and find best market/pool for each group
    const groupedData: GroupedMarket[] = [];

    Object.entries(groups).forEach(([symbol, marketList]) => {
      let bestAPR = 0;
      let bestMarketId = marketList[0].marketId;
      let bestMarket = marketList[0].market;
      let bestMarketIndex = marketList[0].marketIndex;
      let bestPoolType: "collateral" | "sail" = "collateral";
      let totalRewardsUSD = 0;
      let totalPositionUSD = 0;
      let collateralSymbol = "";
      let hasStabilityPoolDeposits = false;
      let hasHaTokens = false;

      marketList.forEach(({ marketId, market, marketIndex }) => {
        const hasCollateralPool = !!(market as any).addresses
          ?.stabilityPoolCollateral;
        const hasSailPool = !!(market as any).addresses?.stabilityPoolLeveraged;

        // Calculate offset for this market
        let offset = 0;
        for (let i = 0; i < marketIndex; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses
            ?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses
            ?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses
            ?.collateralPrice;
          const prevHasStabilityPoolManager = !!(prevMarket as any).addresses
            ?.stabilityPoolManager;
          offset += 5; // 4 minter calls + 1 config call
          if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
          if (prevHasCollateral) offset += 4;
          if (prevHasSail) offset += 4;
          if (prevHasPriceOracle) offset += 1;
        }

        const baseOffset = offset;
        const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
          | bigint
          | undefined;

        let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
        let collateralPoolAPR:
          | { collateral: number; steam: number }
          | undefined;
        let sailPoolAPR: { collateral: number; steam: number } | undefined;
        let collateralPoolRewards: bigint | undefined;
        let sailPoolRewards: bigint | undefined;
        let collateralPoolDeposit: bigint | undefined;
        let sailPoolDeposit: bigint | undefined;

        if (hasCollateralPool) {
          const collateralAPRResult = reads?.[currentOffset + 1]?.result as
            | [bigint, bigint]
            | undefined;
          collateralPoolAPR = collateralAPRResult
            ? {
                collateral: (Number(collateralAPRResult[0]) / 1e16) * 100,
                steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
              }
            : undefined;
          collateralPoolRewards = reads?.[currentOffset + 2]?.result as
            | bigint
            | undefined;
          collateralPoolDeposit = reads?.[currentOffset + 3]?.result as
            | bigint
            | undefined;
          currentOffset += 4;
        }

        if (hasSailPool) {
          const sailAPRResult = reads?.[currentOffset + 1]?.result as
            | [bigint, bigint]
            | undefined;
          sailPoolAPR = sailAPRResult
            ? {
                collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
                steam: (Number(sailAPRResult[1]) / 1e16) * 100,
              }
            : undefined;
          sailPoolRewards = reads?.[currentOffset + 2]?.result as
            | bigint
            | undefined;
          sailPoolDeposit = reads?.[currentOffset + 3]?.result as
            | bigint
            | undefined;
          currentOffset += 4;
        }

        // Get price oracle for USD calculations
        // IWrappedPriceOracle.latestAnswer() returns (minPrice, maxPrice, minRate, maxRate) - all in 18 decimals
        const hasPriceOracle = !!(market as any).addresses?.collateralPrice;
        const collateralPriceDecimals = 18;
        let collateralPrice: bigint | undefined;
        if (hasPriceOracle) {
          const latestAnswerResult = reads?.[currentOffset]?.result;
          if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
            if (Array.isArray(latestAnswerResult)) {
              collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice
            } else if (typeof latestAnswerResult === "object") {
              const obj = latestAnswerResult as { maxUnderlyingPrice?: bigint };
              collateralPrice = obj.maxUnderlyingPrice;
            } else if (typeof latestAnswerResult === "bigint") {
              collateralPrice = latestAnswerResult;
            }
          }
        }

        // Calculate APRs
        const collateralTotalAPR = collateralPoolAPR
          ? (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0)
          : 0;
        const sailTotalAPR = sailPoolAPR
          ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
          : 0;

        // Find best APR
        if (collateralTotalAPR > bestAPR) {
          bestAPR = collateralTotalAPR;
          bestMarketId = marketId;
          bestMarket = market;
          bestMarketIndex = marketIndex;
          bestPoolType = "collateral";
        }
        if (sailTotalAPR > bestAPR) {
          bestAPR = sailTotalAPR;
          bestMarketId = marketId;
          bestMarket = market;
          bestMarketIndex = marketIndex;
          bestPoolType = "sail";
        }

        // Calculate rewards USD
        if (
          collateralPoolRewards &&
          collateralPrice &&
          collateralPriceDecimals !== undefined
        ) {
          const price =
            Number(collateralPrice) /
            10 ** (Number(collateralPriceDecimals) || 8);
          const collateralAmount = Number(collateralPoolRewards) / 1e18;
          totalRewardsUSD += collateralAmount * price;
        }
        if (
          sailPoolRewards &&
          peggedTokenPrice &&
          collateralPrice &&
          collateralPriceDecimals !== undefined
        ) {
          const peggedPrice = Number(peggedTokenPrice) / 1e18;
          const collateralPriceNum =
            Number(collateralPrice) /
            10 ** (Number(collateralPriceDecimals) || 8);
          const leveragedAmount = Number(sailPoolRewards) / 1e18;
          totalRewardsUSD +=
            leveragedAmount * (peggedPrice * collateralPriceNum);
        }

        // Get position data from unified hook
        const position = marketPositions[marketId];

        if (position) {
          // Track position USD from hook
          if (position.collateralPool > 0n) {
            hasStabilityPoolDeposits = true;
          }
          if (position.sailPool > 0n) {
            hasStabilityPoolDeposits = true;
          }
          if (position.walletHa > 0n) {
            hasHaTokens = true;
          }
          // Use totalUSD from hook (includes wallet + both pools)
          totalPositionUSD += position.totalUSD || 0;
        }

        if (!collateralSymbol && market.collateral?.symbol) {
          collateralSymbol = market.collateral.symbol;
        }
      });

      groupedData.push({
        symbol,
        markets: marketList,
        bestMarketId,
        bestMarket,
        bestMarketIndex,
        bestPoolType,
        combinedAPR: bestAPR,
        combinedRewardsUSD: totalRewardsUSD,
        combinedPositionUSD: totalPositionUSD,
        collateralSymbol,
        hasStabilityPoolDeposits,
        hasHaTokens,
      });
    });

    return groupedData;
  }, [reads, anchorMarkets, marketPositions]);
}


