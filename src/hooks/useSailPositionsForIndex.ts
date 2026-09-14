"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { getSailPriceGraphUrlOptional, getGraphHeaders } from "@/config/graph";

export const SAIL_POSITIONS_FOR_INDEX_QUERY_KEY = "sailPositionsForIndex";

export type SailPositionsPnLSummary = {
  positionsCount: number;
  totalPositionsUSD: number;
  totalUnrealizedPnLUSD: number;
  totalRealizedPnLUSD: number;
  totalPnLUSD: number;
  isLoading: boolean;
  error: string | null;
};

const USER_POSITIONS_QUERY = `
  query GetUserSailPositions($userAddress: Bytes!) {
    userSailPositions(
      where: { user: $userAddress, balance_gt: "0" }
      first: 1000
    ) {
      id
      tokenAddress
      balanceUSD
      totalCostBasisUSD
      realizedPnLUSD
    }
  }
`;

export type SailIndexPosition = {
  id?: string;
  tokenAddress: string;
  balanceUSD: number;
  totalCostBasisUSD: number;
  realizedPnLUSD: number;
};

const INDEX_REFETCH_MS = 60_000;

function refetchIntervalWhenVisible(): number | false {
  if (typeof document !== "undefined" && document.hidden) return false;
  return INDEX_REFETCH_MS;
}

function emptySummary(
  isLoading: boolean,
  error: string | null
): SailPositionsPnLSummary {
  return {
    positionsCount: 0,
    totalPositionsUSD: 0,
    totalUnrealizedPnLUSD: 0,
    totalRealizedPnLUSD: 0,
    totalPnLUSD: 0,
    isLoading,
    error,
  };
}

function summarizePositions(
  positions: SailIndexPosition[],
  isLoading: boolean,
  error: string | null
): SailPositionsPnLSummary {
  let totalPositionsUSD = 0;
  let totalRealizedPnLUSD = 0;
  let totalUnrealizedPnLUSD = 0;

  for (const p of positions) {
    const bal = Number(p.balanceUSD) || 0;
    const cost = Number(p.totalCostBasisUSD) || 0;
    const realized = Number(p.realizedPnLUSD) || 0;
    totalPositionsUSD += bal;
    totalRealizedPnLUSD += realized;
    totalUnrealizedPnLUSD += bal - cost;
  }

  return {
    positionsCount: positions.length,
    totalPositionsUSD,
    totalUnrealizedPnLUSD,
    totalRealizedPnLUSD,
    totalPnLUSD: totalRealizedPnLUSD + totalUnrealizedPnLUSD,
    isLoading,
    error,
  };
}

/**
 * Single subgraph query for Sail index strip PnL + per-market dropdown joins.
 * Replaces the former duplicate `sailPositionsPnLSummary` / `sailPositionsForPnL` fetches.
 */
export function useSailPositionsForIndex(enabled: boolean = true) {
  const { address } = useHarborAccount();
  const graphUrl = getSailPriceGraphUrlOptional();

  const { data, isLoading, error } = useQuery({
    queryKey: [SAIL_POSITIONS_FOR_INDEX_QUERY_KEY, graphUrl, address],
    queryFn: async () => {
      if (!graphUrl || !address) {
        return { userSailPositions: [] as SailIndexPosition[] };
      }

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(graphUrl),
        body: JSON.stringify({
          query: USER_POSITIONS_QUERY,
          variables: { userAddress: address.toLowerCase() },
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.errors) {
        throw new Error(
          `PnL subgraph query failed (${response.status}). ${
            result?.errors ? JSON.stringify(result.errors) : ""
          }`
        );
      }
      return result?.data ?? { userSailPositions: [] };
    },
    enabled: enabled && !!address && !!graphUrl,
    refetchInterval: refetchIntervalWhenVisible,
    staleTime: 15_000,
  });

  const positions = useMemo((): SailIndexPosition[] => {
    return (data?.userSailPositions ?? []) as SailIndexPosition[];
  }, [data?.userSailPositions]);

  const sailPnLSummary = useMemo((): SailPositionsPnLSummary => {
    if (!graphUrl && enabled && !!address) {
      return emptySummary(
        false,
        "PnL unavailable: Sail price subgraph URL is not configured."
      );
    }
    return summarizePositions(
      positions,
      isLoading,
      error ? String(error) : null
    );
  }, [graphUrl, enabled, address, positions, isLoading, error]);

  return {
    positions,
    positionsPnLLoading: isLoading,
    sailPnLSummary,
    error: error ? String(error) : null,
  };
}
