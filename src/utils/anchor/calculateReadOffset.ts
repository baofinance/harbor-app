import type { AnchorMarketTuple } from "@/types/anchor";

/**
 * Utility function to calculate the read offset for a given market index
 * This eliminates duplication of offset calculation logic across multiple hooks
 *
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param marketIndex - Index of the market to calculate offset for
 * @returns The offset value for the given market index
 */
export function calculateReadOffset(
  anchorMarkets: AnchorMarketTuple[],
  marketIndex: number
): number {
  let offset = 0;
  
  for (let i = 0; i < marketIndex; i++) {
    const prevMarket = anchorMarkets[i][1];
    const prevHasCollateral = !!prevMarket.addresses?.stabilityPoolCollateral;
    const prevHasSail = !!prevMarket.addresses?.stabilityPoolLeveraged;
    const prevHasPriceOracle = !!prevMarket.addresses?.collateralPrice;
    const prevHasStabilityPoolManager = !!prevMarket.addresses?.stabilityPoolManager;
    const prevPeggedTokenAddress = prevMarket.addresses?.peggedToken;
    const prevIsFxUSDMarket =
      prevMarket.collateral?.symbol?.toLowerCase() === "fxusd" ||
      prevMarket.collateral?.symbol?.toLowerCase() === "fxsave";
    
    offset += 7; // 7 minter calls: collateralRatio, collateralTokenBalance, peggedTokenBalance, peggedTokenPrice, leveragedTokenBalance, leveragedTokenPrice, config
    if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
    if (prevHasCollateral) {
      offset += 4; // 4 base pool reads: totalAssets, totalAssetSupply, getAPRBreakdown, getClaimableRewards
      offset += 1; // assetBalanceOf (5th pool read)
      if (prevPeggedTokenAddress) offset += 1; // rewardData (6th pool read if peggedToken exists)
    }
    if (prevHasSail) {
      offset += 4; // 4 base pool reads: totalAssets, totalAssetSupply, getAPRBreakdown, getClaimableRewards
      offset += 1; // assetBalanceOf (5th pool read)
      if (prevPeggedTokenAddress) offset += 1; // rewardData (6th pool read if peggedToken exists)
    }
    if (prevHasPriceOracle) {
      offset += 1; // latestAnswer
      if (prevIsFxUSDMarket) offset += 1; // getPrice for fxUSD markets
    }
  }
  
  return offset;
}

/**
 * Calculate the offset to the price oracle reads for a given market
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param marketIndex - Index of the market
 * @returns The offset to the price oracle reads
 */
export function calculatePriceOracleOffset(
  anchorMarkets: AnchorMarketTuple[],
  marketIndex: number
): number {
  const baseOffset = calculateReadOffset(anchorMarkets, marketIndex);
  const market = anchorMarkets[marketIndex]?.[1];

  if (!market) return baseOffset;

  const hasStabilityPoolManager = !!market.addresses?.stabilityPoolManager;
  const hasCollateralPool = !!market.addresses?.stabilityPoolCollateral;
  const hasSailPool = !!market.addresses?.stabilityPoolLeveraged;
  const peggedTokenAddress = market.addresses?.peggedToken;

  const isFxUSDMarket =
    market.collateral?.symbol?.toLowerCase() === "fxusd" ||
    market.collateral?.symbol?.toLowerCase() === "fxsave";
  
  let priceOracleOffset = baseOffset + 7; // 7 minter reads: collateralRatio, collateralTokenBalance, peggedTokenBalance, peggedTokenPrice, leveragedTokenBalance, leveragedTokenPrice, config
  if (hasStabilityPoolManager) priceOracleOffset += 1; // rebalanceThreshold
  if (hasCollateralPool) {
    priceOracleOffset += 4; // 4 base pool reads: totalAssets, totalAssetSupply, getAPRBreakdown, getClaimableRewards
    priceOracleOffset += 1; // assetBalanceOf (5th pool read)
    if (peggedTokenAddress) priceOracleOffset += 1; // rewardData (6th pool read if peggedToken exists)
  }
  if (hasSailPool) {
    priceOracleOffset += 4; // 4 base pool reads: totalAssets, totalAssetSupply, getAPRBreakdown, getClaimableRewards
    priceOracleOffset += 1; // assetBalanceOf (5th pool read)
    if (peggedTokenAddress) priceOracleOffset += 1; // rewardData (6th pool read if peggedToken exists)
  }
  // Now priceOracleOffset points to latestAnswer (the oracle read)
  // For fxUSD markets, getPrice comes after latestAnswer at priceOracleOffset + 1
  // Return the offset to latestAnswer itself
  
  return priceOracleOffset;
}

