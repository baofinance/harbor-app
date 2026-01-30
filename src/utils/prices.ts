import { formatUnits } from "viem";

/**
 * Helpers for token USD prices. Shared across Anchor, Genesis, Sail modals
 * (fee display, transaction overview, etc.).
 */

export interface DepositTokenPriceInput {
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
  peggedTokenPrice?: bigint | null;
}

/**
 * Map deposit token symbol to USD price.
 * Handles ETH, WETH, wstETH, stETH, fxSAVE, USDC, fxUSD, and ha-tokens (via peggedTokenPrice).
 */
export function getDepositTokenPriceUSD(
  symbol: string,
  prices: DepositTokenPriceInput
): number {
  const s = symbol.toLowerCase();
  if (s === "eth" || s === "weth") return prices.ethPrice ?? 0;
  if (s === "wsteth" || s === "steth") return prices.wstETHPrice ?? 0;
  if (s === "fxsave") return prices.fxSAVEPrice ?? 0;
  if (s === "usdc" || s === "fxusd") return 1.0;
  if (
    s.includes("ha") &&
    prices.peggedTokenPrice != null &&
    prices.peggedTokenPrice > 0n
  ) {
    return Number(prices.peggedTokenPrice) / 1e18;
  }
  return 0;
}

/**
 * USD price for pegged token (18-decimals wei).
 * Uses haETH → ethPrice fallback when pegged price is 0. Used for Early Withdrawal Fee, etc.
 */
export function getPeggedTokenPriceUSD(
  peggedTokenPriceWei: bigint,
  peggedTokenSymbol: string,
  ethPrice?: number | null
): number {
  if (peggedTokenPriceWei > 0n) return Number(formatUnits(peggedTokenPriceWei, 18));
  if (peggedTokenSymbol.toLowerCase().includes("haeth") && ethPrice != null)
    return ethPrice;
  return 0;
}
