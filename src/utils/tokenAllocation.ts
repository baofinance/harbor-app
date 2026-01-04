/**
 * Token allocation utility for $TIDE airdrop calculations
 * Based on total genesis deposits TVL
 */

// Token supply constants
export const TOTAL_TOKEN_SUPPLY = 1_000_000_000; // 1 billion tokens
export const TOKEN_PRICE = 0.01; // $0.01 per token
export const DEFAULT_FDV = 10_000_000; // $10M Fully Diluted Valuation (1B * $0.01)

/**
 * Calculate the percentage of token supply to allocate based on total genesis TVL
 * 
 * Allocation schedule:
 * - < $1M TVL: 1%
 * - $1M - $10M TVL: Linear interpolation from 1% to 4%
 * - $10M - $50M TVL: Linear interpolation from 4% to 10%
 * - >= $50M TVL: 10%
 * 
 * @param totalGenesisTVL - Total TVL in USD from genesis deposits (not stability pools)
 * @returns Percentage as a decimal (e.g., 0.01 for 1%)
 */
export function calculateTokenAllocationPercent(
  totalGenesisTVL: number
): number {
  if (totalGenesisTVL < 1_000_000) {
    return 0.01; // 1%
  }

  if (totalGenesisTVL < 10_000_000) {
    // Linear: 1% at $1M, 4% at $10M
    const slope = (0.04 - 0.01) / (10_000_000 - 1_000_000);
    return 0.01 + (totalGenesisTVL - 1_000_000) * slope;
  }

  if (totalGenesisTVL < 50_000_000) {
    // Linear: 4% at $10M, 10% at $50M
    const slope = (0.10 - 0.04) / (50_000_000 - 10_000_000);
    return 0.04 + (totalGenesisTVL - 10_000_000) * slope;
  }

  return 0.10; // 10%
}

/**
 * Calculate the total number of tokens to distribute based on TVL
 * 
 * @param totalGenesisTVL - Total TVL in USD from genesis deposits
 * @returns Number of tokens to distribute
 */
export function calculateTokenAllocationAmount(
  totalGenesisTVL: number
): number {
  const allocationPercent = calculateTokenAllocationPercent(totalGenesisTVL);
  return TOTAL_TOKEN_SUPPLY * allocationPercent;
}

/**
 * Calculate token price from Fully Diluted Valuation
 * 
 * @param fdv - Fully Diluted Valuation in USD (default: $10M)
 * @returns Token price in USD
 */
export function calculateTokenPrice(fdv: number = DEFAULT_FDV): number {
  return fdv / TOTAL_TOKEN_SUPPLY;
}


