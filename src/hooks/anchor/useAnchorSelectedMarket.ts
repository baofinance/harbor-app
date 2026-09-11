"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DefinedMarket } from "@/config/markets";
import { isAnchorSoonUi } from "@/config/markets";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";

export type UseAnchorSelectedMarketArgs = {
  markets: readonly [string, DefinedMarket][];
  marketsReady: boolean;
  marketPositions: Record<
    string,
    { collateralPool: bigint; sailPool: bigint } | undefined
  >;
  marketsDataById: Map<string, MarketData>;
};

function hasUserPosition(
  positions: UseAnchorSelectedMarketArgs["marketPositions"],
  marketId: string,
): boolean {
  const pos = positions[marketId];
  if (!pos) return false;
  return (
    (pos.collateralPool !== undefined && pos.collateralPool > 0n) ||
    (pos.sailPool !== undefined && pos.sailPool > 0n)
  );
}

function pickDefaultAnchorMarketId(
  markets: readonly [string, DefinedMarket][],
  marketPositions: UseAnchorSelectedMarketArgs["marketPositions"],
): string | null {
  if (markets.length === 0) return null;

  for (const [id] of markets) {
    if (hasUserPosition(marketPositions, id)) return id;
  }

  const live = markets.find(([, market]) => !isAnchorSoonUi(market));
  return live?.[0] ?? markets[0]?.[0] ?? null;
}

export function useAnchorSelectedMarket({
  markets,
  marketsReady,
  marketPositions,
  marketsDataById,
}: UseAnchorSelectedMarketArgs) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedMarketId, setSelectedMarketIdState] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!marketsReady || markets.length === 0) return;

    const urlMarket = searchParams.get("market");
    if (urlMarket && markets.some(([id]) => id === urlMarket)) {
      setSelectedMarketIdState(urlMarket);
      return;
    }

    setSelectedMarketIdState((prev) => {
      if (prev && markets.some(([id]) => id === prev)) return prev;
      return pickDefaultAnchorMarketId(markets, marketPositions);
    });
  }, [marketsReady, markets, searchParams, marketPositions]);

  const setSelectedMarketId = useCallback(
    (marketId: string) => {
      setSelectedMarketIdState(marketId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("market", marketId);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectedMarket = useMemo(() => {
    if (!selectedMarketId) return null;
    const entry = markets.find(([id]) => id === selectedMarketId);
    return entry ? { marketId: entry[0], market: entry[1] } : null;
  }, [markets, selectedMarketId]);

  const selectedMarketData = selectedMarketId
    ? marketsDataById.get(selectedMarketId)
    : undefined;

  return {
    selectedMarketId,
    setSelectedMarketId,
    selectedMarket,
    selectedMarketData,
  };
}
