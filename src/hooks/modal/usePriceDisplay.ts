"use client";

import { useMemo, useCallback } from "react";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";

const COIN_IDS = {
  ethereum: "ethereum",
  bitcoin: "bitcoin",
  wrappedSteth: "wrapped-steth",
  steth: "steth",
  fxSave: "fx-usd-saving",
} as const;

export type PriceKeys = keyof typeof COIN_IDS;

/**
 * Unified price fetching for modals. Aggregates CoinGecko prices for
 * ETH, BTC, wstETH, stETH, fxSAVE. Use for USD display in transaction overviews.
 */
export function usePriceDisplay() {
  const eth = useCoinGeckoPrice(COIN_IDS.ethereum);
  const btc = useCoinGeckoPrice(COIN_IDS.bitcoin);
  const wsteth = useCoinGeckoPrice(COIN_IDS.wrappedSteth);
  const steth = useCoinGeckoPrice(COIN_IDS.steth);
  const fxsave = useCoinGeckoPrice(COIN_IDS.fxSave);

  const prices = useMemo(
    () => ({
      eth: eth.price ?? 0,
      btc: btc.price ?? 0,
      wsteth: wsteth.price ?? 0,
      steth: steth.price ?? 0,
      fxsave: fxsave.price ?? 0,
    }),
    [eth.price, btc.price, wsteth.price, steth.price, fxsave.price]
  );

  const isLoading = useMemo(
    () => eth.isLoading || btc.isLoading || wsteth.isLoading || steth.isLoading || fxsave.isLoading,
    [eth.isLoading, btc.isLoading, wsteth.isLoading, steth.isLoading, fxsave.isLoading]
  );

  const formatUSD = useCallback((value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  return { prices, isLoading, formatUSD };
}

export { useCoinGeckoPrice };
