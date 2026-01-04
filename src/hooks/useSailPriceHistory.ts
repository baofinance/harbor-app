"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSailPriceGraphUrl, getGraphHeaders } from "@/config/graph";

// GraphQL query for sail token price history
const PRICE_HISTORY_QUERY = `
  query GetPriceHistory($tokenAddress: Bytes!, $since: BigInt!) {
    sailTokenPricePoints(
      where: { tokenAddress: $tokenAddress, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      timestamp
      tokenPriceUSD
      collateralPriceUSD
      wrappedRate
      eventType
      collateralAmount
      tokenAmount
      impliedTokenPrice
    }
    
    hourlyPriceSnapshots(
      where: { tokenAddress: $tokenAddress, hourTimestamp_gte: $since }
      orderBy: hourTimestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      hourTimestamp
      tokenPriceUSD
      collateralPriceUSD
      wrappedRate
      totalSupply
      collateralBalance
      leverageRatio
      collateralRatio
    }
  }
`;

export interface PricePoint {
  timestamp: number;
  priceUSD: number;
  eventType: string;
  impliedPrice?: number;
}

export interface HourlySnapshot {
  timestamp: number;
  priceUSD: number;
  totalSupply: string;
  collateralBalance: string;
  leverageRatio: number;
  collateralRatio: number;
}

interface PriceHistoryData {
  pricePoints: PricePoint[];
  hourlySnapshots: HourlySnapshot[];
  isLoading: boolean;
  error: string | null;
}

interface UseSailPriceHistoryOptions {
  tokenAddress: string;
  daysBack?: number; // How many days of history to fetch
  enabled?: boolean;
}

export function useSailPriceHistory({
  tokenAddress,
  daysBack = 30,
  enabled = true,
}: UseSailPriceHistoryOptions): PriceHistoryData {
  const graphUrl = getSailPriceGraphUrl();
  const debug = typeof window !== "undefined" && process.env.NODE_ENV !== "production";
  
  // Calculate timestamp for "since" parameter
  // Important: don't put Date.now() directly in the queryKey (it will change every render).
  const sinceTimestamp = useMemo(
    () => Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60,
    [daysBack]
  );

  const { data, isLoading, error } = useQuery({
    // Include graphUrl so switching subgraph versions/endpoints doesn't reuse cached data from a previous endpoint.
    queryKey: ["sailPriceHistory", graphUrl, tokenAddress, sinceTimestamp],
    queryFn: async () => {
      if (!tokenAddress) {
        return { pricePoints: [], hourlySnapshots: [] };
      }

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(graphUrl),
        body: JSON.stringify({
          query: PRICE_HISTORY_QUERY,
          variables: {
            tokenAddress: tokenAddress.toLowerCase(),
            since: sinceTimestamp.toString(),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `GraphQL query failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
        );
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const pricePoints: PricePoint[] = (result.data?.sailTokenPricePoints || []).map(
        (p: any) => ({
          timestamp: parseInt(p.timestamp),
          priceUSD: parseFloat(p.tokenPriceUSD),
          eventType: p.eventType,
          impliedPrice: p.impliedTokenPrice ? parseFloat(p.impliedTokenPrice) : undefined,
        })
      );

      const hourlySnapshots: HourlySnapshot[] = (result.data?.hourlyPriceSnapshots || []).map(
        (s: any) => ({
          timestamp: parseInt(s.hourTimestamp),
          priceUSD: parseFloat(s.tokenPriceUSD),
          totalSupply: s.totalSupply,
          collateralBalance: s.collateralBalance,
          leverageRatio: parseFloat(s.leverageRatio) / 1e18,
          collateralRatio: parseFloat(s.collateralRatio) / 1e18,
        })
      );

      if (debug) {
        const authHeaderPresent = Boolean(getGraphHeaders(graphUrl)["Authorization"]);
        // Log a tiny sample to avoid console spam
        // eslint-disable-next-line no-console
        console.log("[useSailPriceHistory] subgraph response", {
          graphUrl,
          authHeaderPresent,
          tokenAddress: tokenAddress.toLowerCase(),
          since: sinceTimestamp,
          pricePoints: pricePoints.length,
          hourlySnapshots: hourlySnapshots.length,
          samplePoint: pricePoints[0],
          sampleHourly: hourlySnapshots[0],
          dataKeys: result.data ? Object.keys(result.data) : null,
        });
      }

      return { pricePoints, hourlySnapshots };
    },
    enabled: enabled && !!tokenAddress,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  return {
    pricePoints: data?.pricePoints || [],
    hourlySnapshots: data?.hourlySnapshots || [],
    isLoading,
    error: error ? String(error) : null,
  };
}

// Helper to merge price points and hourly snapshots for continuous chart data
export function mergeChartData(
  pricePoints: PricePoint[],
  hourlySnapshots: HourlySnapshot[]
): Array<{ timestamp: number; priceUSD: number; source: "event" | "hourly" }> {
  const merged: Array<{ timestamp: number; priceUSD: number; source: "event" | "hourly" }> = [];

  // Add all price points
  for (const pp of pricePoints) {
    merged.push({
      timestamp: pp.timestamp,
      priceUSD: pp.priceUSD,
      source: "event",
    });
  }

  // Add hourly snapshots (only if no event in that hour)
  for (const hs of hourlySnapshots) {
    const hourStart = hs.timestamp;
    const hourEnd = hourStart + 3600;
    
    // Check if any event exists in this hour
    const hasEventInHour = pricePoints.some(
      pp => pp.timestamp >= hourStart && pp.timestamp < hourEnd
    );

    if (!hasEventInHour) {
      merged.push({
        timestamp: hs.timestamp,
        priceUSD: hs.priceUSD,
        source: "hourly",
      });
    }
  }

  // Sort by timestamp
  merged.sort((a, b) => a.timestamp - b.timestamp);

  return merged;
}

