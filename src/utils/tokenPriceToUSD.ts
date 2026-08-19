/**
 * Uniform token-to-USD pricing for all modals (Genesis, Anchor, Sail).
 * Ensures consistent "You will receive" USD display across deposit/withdraw/mint/redeem flows.
 */

export interface TokenPriceInputs {
  ethPrice?: number;
  wstETHPrice?: number;
  fxSAVEPrice?: number;
  peggedPriceUSD?: number;
  leveragedPriceUSD?: number;
  /** Fallback for Genesis/modals that have a single collateral price (e.g. from useCollateralPrice) */
  collateralPriceUSD?: number;
}

/**
 * Get USD price for a token symbol.
 * Uses the same logic across Genesis, Anchor, and Sail modals.
 * @param symbol - Token symbol (e.g. "fxSAVE", "hsFXUSD-ETH", "haETH")
 * @param prices - Price inputs
 * @param collateralSymbol - Optional. For leveraged tokens (hs*), the backing collateral (fxSAVE, wstETH) for fallback.
 */
export function getTokenPriceUSD(
  symbol: string,
  prices: TokenPriceInputs,
  collateralSymbol?: string
): number {
  const s = symbol?.toLowerCase() ?? "";
  const col = collateralSymbol?.toLowerCase() ?? "";
  const {
    ethPrice = 0,
    wstETHPrice = 0,
    fxSAVEPrice = 1.08,
    peggedPriceUSD = 0,
    leveragedPriceUSD = 0,
    collateralPriceUSD = 0,
  } = prices;

  if (s === "eth" || s === "weth") return ethPrice;
  if (s === "wsteth" || s === "steth") return wstETHPrice > 0 ? wstETHPrice : ethPrice;
  if (s === "fxsave") return fxSAVEPrice;
  if (s === "usdc" || s === "fxusd") return 1.0;

  // Pegged tokens (haETH, haBTC, etc.) - haETH uses ETH price, others use pegged
  if (s.startsWith("ha")) {
    if (s.includes("haeth")) return ethPrice || peggedPriceUSD;
    return peggedPriceUSD > 0 ? peggedPriceUSD : 0;
  }

  // Leveraged tokens (hsFXUSD-ETH, hsSTETH-EUR, hsSTETH-BTC, etc.)
  if (s.startsWith("hs")) {
    // On-chain NAV × peg target (from useTokenPrices) — authoritative when present.
    if (leveragedPriceUSD > 0) return leveragedPriceUSD;

    const isFxSaveBacked =
      col === "fxsave" || col === "fxusd" || s.includes("fxusd");
    if (isFxSaveBacked) return fxSAVEPrice;

    // wstETH-backed without NAV: do not fall back to ETH/wstETH spot — that
    // overstates EUR/BTC sail tokens by ~1000× (e.g. hsSTETH-EUR shown as ~$197k).
    return 0;
  }

  // Genesis/modals: use collateralPriceUSD when symbol is a collateral type
  if (collateralPriceUSD > 0 && (s === "fxsave" || s === "wsteth" || s === "steth" || s === "fxusd")) {
    return collateralPriceUSD;
  }

  return 0;
}

/**
 * Convert token amount (in human-readable units) to USD value.
 * @param amount - Amount as number (e.g. from formatEther)
 * @param symbol - Token symbol for pricing
 * @param prices - Price inputs
 * @param collateralSymbol - Optional, for leveraged tokens
 * @returns USD value, or 0 if unable to price
 */
export function amountToUSD(
  amount: number,
  symbol: string,
  prices: TokenPriceInputs,
  collateralSymbol?: string
): number {
  if (!amount || amount <= 0 || !Number.isFinite(amount)) return 0;
  const price = getTokenPriceUSD(symbol, prices, collateralSymbol);
  return price > 0 ? amount * price : 0;
}
