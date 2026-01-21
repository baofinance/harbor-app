/**
 * Utility function to calculate the read offset for a given market index
 * This eliminates duplication of offset calculation logic across multiple hooks
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param marketIndex - Index of the market to calculate offset for
 * @returns The offset value for the given market index
 */
export function calculateReadOffset(
  anchorMarkets: Array<[string, any]>,
  marketIndex: number
): number {
  let offset = 0;
  
  for (let i = 0; i < marketIndex; i++) {
    const prevMarket = anchorMarkets[i][1];
    const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
    const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
    const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
    const prevHasStabilityPoolManager = !!(prevMarket as any).addresses?.stabilityPoolManager;
    const prevPeggedTokenAddress = (prevMarket as any)?.addresses?.peggedToken;
    const prevIsFxUSDMarket = 
      (prevMarket as any).collateral?.symbol?.toLowerCase() === "fxusd" ||
      (prevMarket as any).collateral?.symbol?.toLowerCase() === "fxsave";
    
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
  anchorMarkets: Array<[string, any]>,
  marketIndex: number
): number {
  const baseOffset = calculateReadOffset(anchorMarkets, marketIndex);
  const market = anchorMarkets[marketIndex]?.[1];
  
  if (!market) return baseOffset;
  
  const hasStabilityPoolManager = !!(market as any).addresses?.stabilityPoolManager;
  const hasCollateralPool = !!(market as any).addresses?.stabilityPoolCollateral;
  const hasSailPool = !!(market as any).addresses?.stabilityPoolLeveraged;
  const peggedTokenAddress = (market as any)?.addresses?.peggedToken;
  
  const isFxUSDMarket = 
    (market as any).collateral?.symbol?.toLowerCase() === "fxusd" ||
    (market as any).collateral?.symbol?.toLowerCase() === "fxsave";
  
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

