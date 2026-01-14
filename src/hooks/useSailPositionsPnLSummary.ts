"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getSailPriceGraphUrlOptional, getGraphHeaders } from "@/config/graph";

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

export type SailPositionsPnLSummary = {
  positionsCount: number;
  totalPositionsUSD: number;
  totalUnrealizedPnLUSD: number;
  totalRealizedPnLUSD: number;
  totalPnLUSD: number;
  isLoading: boolean;
  error: string | null;
};

export function useSailPositionsPnLSummary(
  enabled: boolean = true
): SailPositionsPnLSummary {
  const { address } = useAccount();
  const graphUrl = getSailPriceGraphUrlOptional();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sailPositionsPnLSummary", graphUrl, address],
    queryFn: async () => {
      if (!graphUrl || !address) {
        return { userSailPositions: [] as any[] };
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
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // If subgraph isn’t configured, keep UI stable but communicate why.
  if (!graphUrl && enabled && !!address) {
    return {
      positionsCount: 0,
      totalPositionsUSD: 0,
      totalUnrealizedPnLUSD: 0,
      totalRealizedPnLUSD: 0,
      totalPnLUSD: 0,
      isLoading: false,
      error: "PnL unavailable: Sail price subgraph URL is not configured.",
    };
  }

  const positions = (data?.userSailPositions ?? []) as Array<{
    balanceUSD: number;
    totalCostBasisUSD: number;
    realizedPnLUSD: number;
  }>;

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
    error: error ? String(error) : null,
  };
}

