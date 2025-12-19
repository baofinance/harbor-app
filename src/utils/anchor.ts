/**
 * Utility functions for Anchor page
 */

/**
 * Get accepted deposit assets for a market
 */
export function getAcceptedDepositAssets(
  market: any,
  peggedTokenSymbol?: string
): Array<{ symbol: string; name: string }> {
  const assets: Array<{ symbol: string; name: string }> = [];
  
  // Use acceptedAssets from market config if available
  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    assets.push(...market.acceptedAssets);
  } else if (market?.collateral?.symbol) {
    // Fallback: return collateral token as the only accepted asset
    assets.push({ 
      symbol: market.collateral.symbol, 
      name: market.collateral.name || market.collateral.symbol 
    });
  }
  
  // Add pegged token if provided (e.g., haPB)
  if (peggedTokenSymbol && !assets.some(a => a.symbol === peggedTokenSymbol)) {
    assets.push({
      symbol: peggedTokenSymbol,
      name: peggedTokenSymbol,
    });
  }
  
  return assets;
}

/**
 * Format collateral ratio as percentage
 */
export function formatRatio(value: bigint | undefined): string {
  if (value === undefined || value === null) return "-";
  // Handle 0n explicitly - show "0.00%" instead of "-"
  if (value === 0n) return "0.00%";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Format APR values
 */
export function formatAPR(apr: number | undefined, hasRewardsNoTVL?: boolean): string {
  if (hasRewardsNoTVL && apr !== undefined && apr >= 10000) return "10k%+";
  if (apr === undefined || isNaN(apr)) return "-";
  if (apr >= 10000) return "10k%+";
  return `${apr.toFixed(2)}%`;
}

/**
 * Format USD values compactly (e.g., $1.2k, $3.5m, $1.2b)
 */
export function formatCompactUSD(value: number): string {
  if (value === 0) return "$0";
  if (value < 0) return `-${formatCompactUSD(-value)}`;

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `$${(absValue / 1e9).toFixed(2)}b`;
  }
  if (absValue >= 1e6) {
    return `$${(absValue / 1e6).toFixed(2)}m`;
  }
  if (absValue >= 1e3) {
    return `$${(absValue / 1e3).toFixed(2)}k`;
  }

  return `$${absValue.toFixed(2)}`;
}

/**
 * Calculate the adverse price movement between collateral and pegged token needed to reach below 100% collateral ratio (depeg point).
 *
 * This measures protection against relative price changes (e.g., ETH price spike for ETH-pegged token with USD collateral).
 *
 * This accounts for stability pools that can rebalance and improve the CR:
 * - Collateral Pool: Burns pegged tokens → receives collateral (reduces both debt AND collateral)
 * - Sail Pool: Burns pegged tokens → receives leveraged tokens (reduces ONLY debt, more effective)
 *
 * The sail pool is more effective because leveraged tokens represent the excess collateral
 * above 100% CR, so converting pegged→leveraged only reduces debt while collateral stays.
 */
export function calculateVolatilityProtection(
  collateralRatio: bigint | undefined,
  totalDebt: bigint | undefined,
  collateralPoolTVL: bigint | undefined,
  sailPoolTVL: bigint | undefined
): string {
  // Need both CR and debt to calculate
  if (!collateralRatio || !totalDebt || totalDebt === 0n) return "-";

  // Calculate collateral value from CR and debt
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% CR)
  // collateralValue = CR * debt / 1e18
  const collateralValue = (collateralRatio * totalDebt) / 10n ** 18n;

  // Pool TVLs (in pegged tokens)
  const collateralPoolAbsorption = collateralPoolTVL || 0n;
  const sailPoolAbsorption = sailPoolTVL || 0n;

  // Total debt reduction from both pools
  const totalDebtReduction = collateralPoolAbsorption + sailPoolAbsorption;

  // Cap debt reduction at total debt
  const effectiveDebtReduction =
    totalDebtReduction > totalDebt ? totalDebt : totalDebtReduction;

  // Collateral reduction: ONLY from collateral pool (sail pool doesn't remove collateral)
  const effectiveCollateralReduction =
    collateralPoolAbsorption > collateralValue
      ? collateralValue
      : collateralPoolAbsorption;

  // Effective values after full rebalancing
  const effectiveDebt = totalDebt - effectiveDebtReduction;
  const effectiveCollateral = collateralValue - effectiveCollateralReduction;

  // If all debt can be absorbed by pools, infinite protection
  if (effectiveDebt === 0n) return ">100%";

  // If no collateral left after pool drain, already at risk
  if (effectiveCollateral === 0n) return "0%";

  // Calculate price drop needed to reach 100% CR
  // At 100% CR: effectiveCollateral * (1 - X) = effectiveDebt
  // X = 1 - (effectiveDebt / effectiveCollateral)
  const debtNum = Number(effectiveDebt);
  const collateralNum = Number(effectiveCollateral);

  if (debtNum >= collateralNum) return "0%"; // Already at or below 100% CR

  const priceDropPercent = (1 - debtNum / collateralNum) * 100;

  if (priceDropPercent <= 0) return "0%";
  if (priceDropPercent >= 100) return ">100%";

  return `${priceDropPercent.toFixed(1)}%`;
}


