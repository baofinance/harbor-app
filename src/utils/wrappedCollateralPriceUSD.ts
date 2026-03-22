/**
 * Pure wrapped-collateral USD math aligned with {@link useWrappedCollateralPrice}.
 * Use {@link deriveUnderlyingPriceUSDFromHookInputs} + {@link computeWrappedCollateralPriceUsdCore}
 * for modal/single-market flows; {@link computeGenesisWrappedCollateralPriceUSD} for Genesis index batch rows.
 */

export function deriveUnderlyingPriceUSDFromHookInputs({
  collateralSymbol,
  coinGeckoPrice,
  oraclePriceUSD,
}: {
  collateralSymbol: string;
  coinGeckoPrice: number | null | undefined;
  oraclePriceUSD: number;
}): number {
  if (coinGeckoPrice != null && coinGeckoPrice > 0) {
    return coinGeckoPrice;
  }
  const c = collateralSymbol.toLowerCase();
  if (c === "fxusd" || c === "fxsave") {
    return 1.0;
  }
  return oraclePriceUSD;
}

export function computeWrappedCollateralPriceUsdCore({
  underlyingPriceUSD,
  collateralSymbol,
  coinGeckoId,
  coinGeckoPrice,
  stEthCoinGeckoPrice,
  wrappedRate,
}: {
  underlyingPriceUSD: number;
  collateralSymbol: string;
  coinGeckoId?: string;
  coinGeckoPrice: number | null | undefined;
  stEthCoinGeckoPrice: number | null | undefined;
  wrappedRate: bigint | undefined;
}): number {
  const col = collateralSymbol.toLowerCase();
  const isWstETH = col === "wsteth";

  const coinGeckoIsWrappedToken =
    !!coinGeckoId &&
    ((coinGeckoId.toLowerCase() === "wrapped-steth" && isWstETH) ||
      ((coinGeckoId.toLowerCase() === "fxsave" ||
        coinGeckoId.toLowerCase() === "fx-usd-saving") &&
        col === "fxsave"));

  if (coinGeckoIsWrappedToken && coinGeckoPrice != null) {
    return coinGeckoPrice;
  }

  if (
    isWstETH &&
    stEthCoinGeckoPrice != null &&
    wrappedRate &&
    wrappedRate > 0n
  ) {
    return stEthCoinGeckoPrice * (Number(wrappedRate) / 1e18);
  }

  if (coinGeckoPrice != null && !coinGeckoIsWrappedToken && wrappedRate) {
    return coinGeckoPrice * (Number(wrappedRate) / 1e18);
  }

  if (coinGeckoPrice != null && !coinGeckoIsWrappedToken) {
    return coinGeckoPrice;
  }

  if (wrappedRate && underlyingPriceUSD > 0) {
    return underlyingPriceUSD * (Number(wrappedRate) / 1e18);
  }

  return underlyingPriceUSD;
}

/** Genesis index: underlying USD may use `underlyingSymbol` (e.g. fxUSD) and BTC-peg oracle scaling before wrapped price. */
export function computeGenesisWrappedCollateralPriceUSD({
  underlyingPriceUSD,
  collateralSymbol,
  marketCoinGeckoId,
  coinGeckoReturnedPrice,
  stETHPrice,
  wrappedRate,
  coinGeckoLoading,
}: {
  underlyingPriceUSD: number;
  collateralSymbol: string;
  marketCoinGeckoId: string | undefined;
  coinGeckoReturnedPrice: number | null | undefined;
  stETHPrice: number | null | undefined;
  wrappedRate: bigint | undefined;
  coinGeckoLoading: boolean;
}): number {
  const coinGeckoId = marketCoinGeckoId;
  const col = collateralSymbol.toLowerCase();
  const isWstETH = col === "wsteth";
  const isFxSAVE = col === "fxsave";

  const coinGeckoIsWrappedToken =
    coinGeckoReturnedPrice &&
    coinGeckoId &&
    ((coinGeckoId.toLowerCase() === "wrapped-steth" && isWstETH) ||
      ((coinGeckoId.toLowerCase() === "fx-usd-saving" ||
        coinGeckoId.toLowerCase() === "fxsave") &&
        isFxSAVE));

  const useStETHFallback =
    isWstETH &&
    !coinGeckoIsWrappedToken &&
    underlyingPriceUSD === 0 &&
    stETHPrice &&
    stETHPrice > 0 &&
    wrappedRate &&
    wrappedRate > 0n;

  if (
    coinGeckoIsWrappedToken &&
    coinGeckoReturnedPrice &&
    coinGeckoReturnedPrice > 0
  ) {
    return coinGeckoReturnedPrice;
  }
  if (useStETHFallback) {
    return stETHPrice! * (Number(wrappedRate) / 1e18);
  }
  if (
    (isWstETH || isFxSAVE) &&
    coinGeckoLoading &&
    marketCoinGeckoId &&
    underlyingPriceUSD > 0 &&
    wrappedRate
  ) {
    return underlyingPriceUSD * (Number(wrappedRate) / 1e18);
  }
  if (wrappedRate && underlyingPriceUSD > 0) {
    return underlyingPriceUSD * (Number(wrappedRate) / 1e18);
  }
  if (coinGeckoLoading && marketCoinGeckoId) {
    return 0;
  }
  if (isFxSAVE) {
    return 1.07;
  }
  return underlyingPriceUSD;
}
