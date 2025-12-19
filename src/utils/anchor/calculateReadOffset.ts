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
    
    offset += 5; // 4 minter calls + 1 config call
    if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
    if (prevHasCollateral) {
      offset += 4; // 4 pool reads
      if (prevPeggedTokenAddress) offset += 1; // rewardData
    }
    if (prevHasSail) {
      offset += 4; // 4 pool reads
      if (prevPeggedTokenAddress) offset += 1; // rewardData
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
  
  let priceOracleOffset = baseOffset + 5; // minter reads
  if (hasStabilityPoolManager) priceOracleOffset += 1;
  if (hasCollateralPool) {
    priceOracleOffset += 4;
    if (peggedTokenAddress) priceOracleOffset += 1;
  }
  if (hasSailPool) {
    priceOracleOffset += 4;
    if (peggedTokenAddress) priceOracleOffset += 1;
  }
  
  return priceOracleOffset;
}

