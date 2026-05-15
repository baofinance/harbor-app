"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import { markets } from "@/config/markets";
import { getGraphHeaders, getGraphUrl } from "@/config/graph";
import { deriveFounderWalletMetric, type FounderParticipant } from "@/utils/founderMetrics";

type FounderGraphResponse = {
  maidenVoyageYieldGlobals?: Array<{ cumulativeYieldUSD?: string }>;
  userHarborMarks_collection?: FounderParticipant[];
};

export type FounderMetricRow = {
  marketId: string;
  marketName: string;
  genesis: Address;
  ownershipSharePct: number;
  /** Maiden Voyage retention multiplier from subgraph; null if no user row. */
  boostMultiplier: number | null;
  yieldSharePct: number;
  totalEarnedUSD: number;
  paidUSD: number;
  outstandingUSD: number;
};

const FOUNDER_QUERY = `
  query DashboardFounder($genesis: Bytes!, $skip: Int!, $capId: ID!) {
    maidenVoyageYieldGlobals(first: 1, where: { id: $capId }) {
      cumulativeYieldUSD
    }
    userHarborMarks_collection(
      first: 500
      skip: $skip
      where: { contractAddress: $genesis }
      orderBy: maidenVoyageDepositCountedUSD
      orderDirection: desc
    ) {
      user
      finalMaidenVoyageOwnershipShare
      maidenVoyageBoostMultiplier
    }
  }
`;

async function fetchGenesisParticipants(genesis: Address): Promise<{
  cumulativeYieldUSD: number;
  participants: FounderParticipant[];
}> {
  const graphUrl = getGraphUrl();
  const capId = genesis.toLowerCase();
  const all: FounderParticipant[] = [];
  let skip = 0;
  let cumulativeYieldUSD = 0;
  for (;;) {
    const res = await fetch(graphUrl, {
      method: "POST",
      headers: getGraphHeaders(graphUrl),
      body: JSON.stringify({
        query: FOUNDER_QUERY,
        variables: {
          genesis: genesis.toLowerCase(),
          skip,
          capId,
        },
      }),
    });
    const json = (await res.json()) as {
      errors?: Array<{ message?: string }>;
      data?: FounderGraphResponse;
    };
    if (json.errors?.length) {
      throw new Error(
        json.errors.map((e) => e.message).filter(Boolean).join("; ") || "Graph failed"
      );
    }
    const data = json.data || {};
    if (skip === 0) {
      const raw = data.maidenVoyageYieldGlobals?.[0]?.cumulativeYieldUSD || "0";
      cumulativeYieldUSD = Number.parseFloat(raw) || 0;
    }
    const chunk = data.userHarborMarks_collection || [];
    all.push(...chunk);
    if (chunk.length < 500) break;
    skip += 500;
  }
  return { cumulativeYieldUSD, participants: all };
}

export function useFounderMetrics() {
  const { address, isConnected } = useAccount();
  const [rows, setRows] = useState<FounderMetricRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const founderMarkets = useMemo(() => {
    return Object.entries(markets)
      .map(([id, m]) => {
        const genesis = (m as any)?.addresses?.genesis as Address | undefined;
        if (!genesis || !isAddress(genesis)) return null;
        return {
          id,
          name: (m as any)?.name ?? id,
          genesis,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, []);

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setRows([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const walletLower = address.toLowerCase();
      const [graphByMarket, ledgerRes] = await Promise.all([
        Promise.all(
          founderMarkets.map(async (m) => ({
            market: m,
            ...(await fetchGenesisParticipants(m.genesis)),
          }))
        ),
        fetch("/api/dashboard/founder-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: walletLower,
            genesises: founderMarkets.map((m) => m.genesis),
          }),
        }),
      ]);

      const ledgerJson = (await ledgerRes.json()) as {
        error?: string;
        paidByGenesis?: Record<string, number>;
      };
      if (!ledgerRes.ok) {
        throw new Error(ledgerJson.error || "Failed to load ledger metrics");
      }
      const paidByGenesis = ledgerJson.paidByGenesis || {};

      const nextRows = graphByMarket
        .map(({ market, cumulativeYieldUSD, participants }) => {
          const paidUSD = Number(paidByGenesis[market.genesis.toLowerCase()] || 0);
          const derived = deriveFounderWalletMetric({
            wallet: walletLower,
            participants,
            cumulativeYieldUSD,
            paidUSD,
          });
          return {
            marketId: market.id,
            marketName: market.name,
            genesis: market.genesis,
            ...derived,
          };
        })
        .filter(
          (r) =>
            r.ownershipSharePct > 0 ||
            r.yieldSharePct > 0 ||
            r.totalEarnedUSD > 0 ||
            Math.abs(r.outstandingUSD) > 0 ||
            r.paidUSD > 0
        )
        .sort((a, b) => b.outstandingUSD - a.outstandingUSD);

      setRows(nextRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load founder metrics");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, founderMarkets]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    rows,
    isLoading,
    error,
    refresh,
    isConnected,
    walletAddress: address,
  };
}

