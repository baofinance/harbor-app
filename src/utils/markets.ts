/**
 * Accepted deposit assets for a market (from config or collateral fallback).
 * Optionally append the pegged token (e.g. haPB) when provided.
 */
export function getAcceptedDepositAssets(
  market: any,
  peggedTokenSymbol?: string
): Array<{ symbol: string; name: string }> {
  const assets: Array<{ symbol: string; name: string }> = [];

  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    assets.push(...market.acceptedAssets);
  } else if (market?.collateral?.symbol) {
    assets.push({
      symbol: market.collateral.symbol,
      name: market.collateral.name || market.collateral.symbol,
    });
  }

  if (
    peggedTokenSymbol &&
    !assets.some((a) => a.symbol === peggedTokenSymbol)
  ) {
    assets.push({
      symbol: peggedTokenSymbol,
      name: peggedTokenSymbol,
    });
  }

  return assets;
}
