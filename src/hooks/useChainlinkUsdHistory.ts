"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { fetchChainlinkUsdHistory } from "@/lib/chainlinkUsdHistory";
import type { ChainlinkPricePoint, PegAssetKey } from "@/utils/sailMarketChartSeries";

export type { ChainlinkPricePoint };

async function fetchHistoryFromApi(
  asset: PegAssetKey,
  minTimestamp?: number,
): Promise<ChainlinkPricePoint[]> {
  const params = new URLSearchParams({ asset });
  if (minTimestamp != null) {
    params.set("since", String(minTimestamp));
  }

  const res = await fetch(`/api/chainlink/history?${params.toString()}`);
  const json = (await res.json()) as {
    points?: ChainlinkPricePoint[];
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Failed to load Chainlink history");
  }

  return json.points ?? [];
}

export function useChainlinkUsdHistory(
  asset: PegAssetKey | null,
  enabled = true,
  /** Earliest unix timestamp the series should cover (optional). */
  minTimestamp?: number,
): { priceHistory: ChainlinkPricePoint[]; isLoading: boolean } {
  const publicClient = usePublicClient({ chainId: 1 });

  const shouldFetch =
    enabled && !!asset && asset !== "USD";

  const { data, isLoading } = useQuery({
    queryKey: ["chainlinkUsdHistory", asset, minTimestamp],
    queryFn: async () => {
      try {
        return await fetchHistoryFromApi(asset as PegAssetKey, minTimestamp);
      } catch {
        if (!publicClient) {
          throw new Error("RPC client unavailable");
        }
        return fetchChainlinkUsdHistory(
          publicClient,
          asset as PegAssetKey,
          minTimestamp,
        );
      }
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!shouldFetch) {
    return { priceHistory: [], isLoading: false };
  }

  return {
    priceHistory: data ?? [],
    isLoading: isLoading && !data,
  };
}
