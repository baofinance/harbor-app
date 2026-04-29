/**
 * Single source of truth for Genesis index row USD pricing (active + completed tables).
 * Underlying USD pipeline matches the former inline logic in `genesis/page.tsx`;
 * wrapped USD delegates to {@link computeGenesisWrappedCollateralPriceUSD}.
 */

import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import { computeGenesisWrappedCollateralPriceUSD } from "@/utils/wrappedCollateralPriceUSD";

export type ComputeGenesisRowUsdPricingArgs = {
  underlyingSymbol: string;
  /** Market peg target (e.g. btc, eth) — lowercased inside */
  pegTarget?: string;
  marketCoinGeckoId: string | undefined;
  /** Pass-through from `useCoinGeckoPrices` (`Record<string, number | null>`). */
  coinGeckoPrices: Record<string, number | null>;
  collateralPriceData: CollateralPriceData | undefined;
  /** Mainnet Chainlink BTC/USD (8 decimals read → number); null if unavailable */
  chainlinkBtcPrice: number | null;
  coinGeckoLoading: boolean;
  collateralSymbol: string;
};

export type ComputeGenesisRowUsdPricingResult = {
  underlyingPriceUSD: number;
  priceError: string | null;
  wrappedTokenPriceUSD: number;
  collateralPriceUSD: number;
};

/**
 * Computes underlying USD (fxUSD → CoinGecko → oracle with BTC-peg scaling) and
 * wrapped collateral USD for one Genesis market row.
 */
export function computeGenesisRowUsdPricing({
  underlyingSymbol,
  pegTarget,
  marketCoinGeckoId,
  coinGeckoPrices,
  collateralPriceData,
  chainlinkBtcPrice,
  coinGeckoLoading,
  collateralSymbol,
}: ComputeGenesisRowUsdPricingArgs): ComputeGenesisRowUsdPricingResult {
  const underlyingPriceFromOracle = collateralPriceData?.priceUSD ?? 0;
  const wrappedRate = collateralPriceData?.maxRate;

  let underlyingPriceUSD = 0;
  let priceError: string | null = null;

  if (underlyingSymbol.toLowerCase() === "fxusd") {
    underlyingPriceUSD = 1.0;
  } else if (
    marketCoinGeckoId &&
    coinGeckoPrices[marketCoinGeckoId] != null &&
    coinGeckoPrices[marketCoinGeckoId]! > 0
  ) {
    underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
  } else if (underlyingPriceFromOracle > 0) {
    let oraclePriceUSD = underlyingPriceFromOracle;

    const peg = pegTarget?.toLowerCase();
    const isBTCMarket = peg === "btc" || peg === "bitcoin";
    if (isBTCMarket && oraclePriceUSD > 0 && oraclePriceUSD < 1) {
      // Same as legacy: prefer CoinGecko BTC when truthy, else Chainlink fallback
      const btcPriceUSD =
        coinGeckoPrices["bitcoin"] || chainlinkBtcPrice || 0;
      if (btcPriceUSD > 0) {
        oraclePriceUSD = oraclePriceUSD * btcPriceUSD;
      }
    }

    if (oraclePriceUSD > 0.01) {
      underlyingPriceUSD = oraclePriceUSD;
    } else {
      priceError = "Price oracle returned value too small (<0.01)";
    }
  } else {
    if (collateralPriceData?.error) {
      priceError = `Failed to read price oracle: ${
        collateralPriceData.error.message || "Unknown error"
      }`;
    } else {
      priceError = "Price oracle not available";
    }
  }

  const coinGeckoReturnedPrice =
    marketCoinGeckoId != null
      ? coinGeckoPrices[marketCoinGeckoId]
      : undefined;
  const stETHPrice = coinGeckoPrices["lido-staked-ethereum-steth"];

  const wrappedTokenPriceUSD = computeGenesisWrappedCollateralPriceUSD({
    underlyingPriceUSD,
    collateralSymbol,
    marketCoinGeckoId,
    coinGeckoReturnedPrice:
      coinGeckoReturnedPrice != null ? coinGeckoReturnedPrice : undefined,
    stETHPrice: stETHPrice ?? undefined,
    wrappedRate,
    coinGeckoLoading,
  });

  return {
    underlyingPriceUSD,
    priceError,
    wrappedTokenPriceUSD,
    collateralPriceUSD: wrappedTokenPriceUSD,
  };
}
