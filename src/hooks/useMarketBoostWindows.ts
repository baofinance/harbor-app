"use client";

import { useQuery } from "@tanstack/react-query";
import { getGraphHeaders, getGraphUrl } from "@/config/graph";

export interface MarketBoostWindow {
  id: string;
  sourceType: string;
  sourceAddress: string;
  startTimestamp: string;
  endTimestamp: string;
  boostMultiplier: string;
}

const BOOST_WINDOWS_BY_IDS_QUERY = `
  query GetMarketBoostWindowsByIds($ids: [ID!]!, $first: Int!) {
    marketBoostWindows(first: $first, where: { id_in: $ids }) {
      id
      sourceType
      sourceAddress
      startTimestamp
      endTimestamp
      boostMultiplier
    }
  }
`;

const ALL_BOOST_WINDOWS_QUERY = `
  query GetAllMarketBoostWindows($first: Int!) {
    marketBoostWindows(first: $first) {
      id
      sourceType
      sourceAddress
      startTimestamp
      endTimestamp
      boostMultiplier
    }
  }
`;

interface UseMarketBoostWindowsOptions {
  enabled?: boolean;
  graphUrl?: string;
  ids?: string[];
  first?: number;
}

export function useMarketBoostWindows({
  enabled = true,
  graphUrl = getGraphUrl(),
  ids,
  first = 100,
}: UseMarketBoostWindowsOptions = {}) {
  return useQuery<{ marketBoostWindows: MarketBoostWindow[] }>({
    queryKey: ["marketBoostWindows", graphUrl, ids?.join(",") ?? "ALL", first],
    enabled: enabled && (!!ids ? ids.length > 0 : true),
    queryFn: async () => {
      const query = ids && ids.length > 0 ? BOOST_WINDOWS_BY_IDS_QUERY : ALL_BOOST_WINDOWS_QUERY;
      const variables =
        ids && ids.length > 0
          ? { ids, first }
          : { first };

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(graphUrl),
        body: JSON.stringify({ query, variables }),
      });

      const json = await response.json();
      if (!response.ok || json.errors) {
        const errText = json?.errors ? JSON.stringify(json.errors) : await response.text();
        throw new Error(
          `[useMarketBoostWindows] Subgraph error: ${response.status} ${response.statusText} ${errText}`
        );
      }
      return json.data as { marketBoostWindows: MarketBoostWindow[] };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
}


