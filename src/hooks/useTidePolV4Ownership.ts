"use client";

import { useQuery } from "@tanstack/react-query";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import type { TidePolV4Snapshot } from "@/lib/tidePolV4Server";

async function fetchPolOwnership(): Promise<TidePolV4Snapshot | null> {
  const res = await fetch("/api/tide/pol-ownership");
  if (res.status === 503) return null;
  if (!res.ok) {
    throw new Error(`POL ownership fetch failed (${res.status})`);
  }
  return (await res.json()) as TidePolV4Snapshot | null;
}

export function useTidePolV4Ownership() {
  const enabled = TIDE_FLYWHEEL_CONFIG.polV4 != null;

  const query = useQuery({
    queryKey: ["tide", "pol-v4-ownership"],
    queryFn: fetchPolOwnership,
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    configured: enabled,
    ownershipPct: query.data?.ownershipPct ?? null,
    tideInPolWei: query.data?.tideInPolWei ?? null,
    positionCount: query.data?.positionCount ?? 0,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
  };
}
