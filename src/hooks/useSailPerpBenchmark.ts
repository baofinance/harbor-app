"use client";

import { useQuery } from "@tanstack/react-query";
import type { SailPerpBenchmarkApiResponse } from "@/lib/sailPerpBenchmarkServer";

async function fetchBenchmark(
  marketId: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<SailPerpBenchmarkApiResponse> {
  const params = new URLSearchParams({
    marketId,
    start: String(Math.floor(startTimestamp)),
    end: String(Math.floor(endTimestamp)),
  });
  const response = await fetch(`/api/sail/perp-benchmark?${params.toString()}`);
  const payload = (await response.json()) as
    | SailPerpBenchmarkApiResponse
    | { error?: string };
  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Perpetual benchmark unavailable",
    );
  }
  return payload as SailPerpBenchmarkApiResponse;
}

export function useSailPerpBenchmark({
  marketId,
  startTimestamp,
  endTimestamp,
  enabled,
}: {
  marketId: string;
  startTimestamp: number | null;
  endTimestamp: number | null;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "sailPerpBenchmark",
      marketId,
      startTimestamp,
      endTimestamp,
    ],
    queryFn: () =>
      fetchBenchmark(marketId, startTimestamp!, endTimestamp!),
    enabled:
      enabled &&
      startTimestamp != null &&
      endTimestamp != null &&
      endTimestamp > startTimestamp,
    staleTime: 15 * 60 * 1_000,
    retry: 1,
  });
}
