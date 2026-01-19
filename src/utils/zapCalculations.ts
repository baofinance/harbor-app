/**
 * Zap Calculation Utilities
 * 
 * Helper functions for calculating minimum output values for zap transactions,
 * including fxSAVE conversion and slippage protection.
 */

/**
 * Calculate minFxSaveOut for USDC/fxUSD stability pool zaps
 * 
 * @param amount - Input amount (USDC in 6 decimals, or fxUSD in 18 decimals)
 * @param fxSAVERate - Wrapped rate for converting to fxSAVE (18 decimals)
 * @param isUSDC - Whether the input is USDC (true) or fxUSD (false)
 * @param slippageBps - Slippage tolerance in basis points (default: 100 = 1%)
 * @returns Minimum fxSAVE output with slippage protection
 * 
 * Formula:
 * - USDC: Scale from 6 to 18 decimals, then divide by wrappedRate
 *   expectedFxSaveOut = (usdcAmount * 10^12 * 1e18) / wrappedRate
 * - fxUSD: Both are in 18 decimals, divide by wrappedRate
 *   expectedFxSaveOut = (fxusdAmount * 1e18) / wrappedRate
 * - Apply slippage: minFxSaveOut = (expectedFxSaveOut * (10000 - slippageBps)) / 10000
 */
export function calculateMinFxSaveOut(
  amount: bigint,
  fxSAVERate: bigint,
  isUSDC: boolean,
  slippageBps: number = 100 // 1% default
): bigint {
  if (!fxSAVERate || fxSAVERate === 0n) {
    throw new Error("fxSAVE rate not available. Cannot calculate minFxSaveOut.");
  }

  let expectedFxSaveOut: bigint;

  if (isUSDC) {
    // USDC: Scale from 6 to 18 decimals, then divide by wrappedRate
    // Formula: (usdcAmount * 10^12 * 1e18) / wrappedRate
    const usdcIn18Decimals = amount * 10n ** 12n;
    expectedFxSaveOut = (usdcIn18Decimals * 1000000000000000000n) / fxSAVERate;
  } else {
    // fxUSD: Both fxUSD and wrappedRate are in 18 decimals
    // Formula: (fxusdAmount * 1e18) / wrappedRate
    expectedFxSaveOut = (amount * 1000000000000000000n) / fxSAVERate;
  }

  // Apply slippage protection: minFxSaveOut = (expectedFxSaveOut * (10000 - slippageBps)) / 10000
  // Default slippageBps = 100 (1% slippage)
  const slippageMultiplier = BigInt(10000 - slippageBps);
  const minFxSaveOut = (expectedFxSaveOut * slippageMultiplier) / 10000n;

  return minFxSaveOut;
}
