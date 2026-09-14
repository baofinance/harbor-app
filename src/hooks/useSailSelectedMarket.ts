"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import { isSailSoonUi } from "@/config/markets";
import { useMarketQueryParam } from "@/hooks/useMarketQueryParam";
import type { SailContractReads } from "@/types/sail";
import { isValidContractAddress } from "@/utils/isValidContractAddress";
import {
  buildSailMarketDetailMetrics,
  computeSailMarketTvlUsd,
  isFxUsdCollateralMarket,
  pickDefaultSailMarketId,
  type SailMarketDetailMetrics,
} from "@/utils/sailMarketMetrics";

export type UseSailSelectedMarketArgs = {
  markets: readonly [string, DefinedMarket][];
  readsReady: boolean;
  reads: SailContractReads | undefined;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
  minterConfigByMarketId: Map<string, unknown>;
  rebalanceThresholdByMarketId: Map<string, bigint | undefined>;
  tokenPricesByMarket: Record<
    string,
    | {
        leveragedPriceUSD: number;
        pegTargetUSD: number;
      }
    | undefined
  >;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
  isCoinGeckoLoading?: boolean;
};

function readMarketSlot<T>(
  reads: SailContractReads | undefined,
  baseOffset: number,
  slot: number
): T | undefined {
  return reads?.[baseOffset + slot]?.result as T | undefined;
}

export function useSailSelectedMarket({
  markets,
  readsReady,
  reads,
  sailMarketIdToIndex,
  marketOffsets,
  minterConfigByMarketId,
  rebalanceThresholdByMarketId,
  tokenPricesByMarket,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
  isCoinGeckoLoading = false,
}: UseSailSelectedMarketArgs) {
  const { marketParam, setMarketParam } = useMarketQueryParam();
  const [selectedMarketId, setSelectedMarketIdState] = useState<string | null>(
    null
  );

  const tvlByMarketId = useMemo(() => {
    const map = new Map<string, number | undefined>();
    if (!reads) return map;

    for (const [id, market] of markets) {
      const globalIndex = sailMarketIdToIndex.get(id);
      if (globalIndex === undefined) continue;
      const baseOffset = marketOffsets.get(globalIndex) ?? 0;
      const collateralValue = readMarketSlot<bigint>(reads, baseOffset, 3);
      const priceOracle = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const hasOracle = isValidContractAddress(priceOracle);
      const isFxUSDMarket = isFxUsdCollateralMarket(market);
      const wrappedRate = hasOracle
        ? readMarketSlot<bigint>(reads, baseOffset, 4)
        : undefined;
      let fxSAVEPriceInETH: bigint | undefined;
      if (hasOracle && isFxUSDMarket) {
        fxSAVEPriceInETH = readMarketSlot<bigint>(reads, baseOffset, 5);
      }

      map.set(
        id,
        computeSailMarketTvlUsd(market, collateralValue, {
          wrappedRate,
          fxSAVEPrice,
          fxSAVEPriceInETH,
          ethPrice,
          wstETHPrice,
          pegTargetUSD: tokenPricesByMarket[id]?.pegTargetUSD,
          isCoinGeckoLoading,
        })
      );
    }
    return map;
  }, [
    markets,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
    ethPrice,
    wstETHPrice,
    fxSAVEPrice,
    isCoinGeckoLoading,
    tokenPricesByMarket,
  ]);

  const metricsByMarketId = useMemo(() => {
    const map = new Map<string, SailMarketDetailMetrics>();
    if (!reads) return map;

    for (const [id, market] of markets) {
      const globalIndex = sailMarketIdToIndex.get(id);
      if (globalIndex === undefined) continue;
      const baseOffset = marketOffsets.get(globalIndex) ?? 0;
      const leverageRatio = readMarketSlot<bigint>(reads, baseOffset, 0);
      const collateralRatio = readMarketSlot<bigint>(reads, baseOffset, 2);
      const collateralValue = readMarketSlot<bigint>(reads, baseOffset, 3);
      const priceOracle = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const hasOracle = isValidContractAddress(priceOracle);
      const isFxUSDMarket = isFxUsdCollateralMarket(market);
      const wrappedRate = hasOracle
        ? readMarketSlot<bigint>(reads, baseOffset, 4)
        : undefined;
      let fxSAVEPriceInETH: bigint | undefined;
      if (hasOracle && isFxUSDMarket) {
        fxSAVEPriceInETH = readMarketSlot<bigint>(reads, baseOffset, 5);
      }

      map.set(
        id,
        buildSailMarketDetailMetrics({
          market,
          marketId: id,
          collateralValue,
          leverageRatio,
          collateralRatio,
          minterConfigData: minterConfigByMarketId.get(id),
          rebalanceThresholdData: rebalanceThresholdByMarketId.get(id),
          tokenPrices: tokenPricesByMarket[id],
          prices: {
            wrappedRate,
            fxSAVEPrice,
            fxSAVEPriceInETH,
            ethPrice,
            wstETHPrice,
            pegTargetUSD: tokenPricesByMarket[id]?.pegTargetUSD,
            isCoinGeckoLoading,
          },
        })
      );
    }
    return map;
  }, [
    markets,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    tokenPricesByMarket,
    ethPrice,
    wstETHPrice,
    fxSAVEPrice,
    isCoinGeckoLoading,
  ]);

  useEffect(() => {
    if (markets.length === 0) return;

    const urlMarket = marketParam;
    // Explicit deep-link wins, including coming-soon markets.
    if (urlMarket && markets.some(([id]) => id === urlMarket)) {
      setSelectedMarketIdState(urlMarket);
      return;
    }

    const firstLiveId =
      markets.find(([, market]) => !isSailSoonUi(market))?.[0] ?? null;

    // Keep a provisional market selected before reads resolve so the advanced
    // layout stays mounted (Earn-style) instead of null-gating the page.
    if (!readsReady) {
      setSelectedMarketIdState((prev) => {
        if (prev) {
          const prevMarket = markets.find(([id]) => id === prev)?.[1];
          // Prefer keeping a non-soon provisional; upgrade away from soon when possible.
          if (prevMarket && !isSailSoonUi(prevMarket)) return prev;
          if (firstLiveId) return firstLiveId;
          if (prevMarket) return prev;
        }
        return firstLiveId ?? markets[0]?.[0] ?? null;
      });
      return;
    }

    const leverageByMarketId = new Map<string, bigint | undefined>();
    for (const [id] of markets) {
      const globalIndex = sailMarketIdToIndex.get(id);
      if (globalIndex === undefined) continue;
      const baseOffset = marketOffsets.get(globalIndex);
      if (baseOffset === undefined) continue;
      leverageByMarketId.set(
        id,
        readMarketSlot<bigint>(reads, baseOffset, 0),
      );
    }

    const defaultId = pickDefaultSailMarketId(
      markets,
      tvlByMarketId,
      leverageByMarketId
    );

    setSelectedMarketIdState((prev) => {
      if (prev && markets.some(([id]) => id === prev)) {
        const prevMarket = markets.find(([id]) => id === prev)?.[1];
        // Don't stick on coming-soon once a live default exists (URL not set).
        if (prevMarket && isSailSoonUi(prevMarket) && defaultId && defaultId !== prev) {
          return defaultId;
        }
        return prev;
      }
      return defaultId;
    });
  }, [
    readsReady,
    markets,
    marketParam,
    tvlByMarketId,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
  ]);

  const setSelectedMarketId = useCallback(
    (marketId: string) => {
      setSelectedMarketIdState(marketId);
      setMarketParam(marketId);
    },
    [setMarketParam]
  );

  const selectedMarket = useMemo(() => {
    if (!selectedMarketId) return null;
    const entry = markets.find(([id]) => id === selectedMarketId);
    return entry ? { marketId: entry[0], market: entry[1] } : null;
  }, [markets, selectedMarketId]);

  const selectedMetrics = selectedMarketId
    ? metricsByMarketId.get(selectedMarketId)
    : undefined;

  return {
    selectedMarketId,
    setSelectedMarketId,
    selectedMarket,
    selectedMetrics,
    tvlByMarketId,
    metricsByMarketId,
  };
}
