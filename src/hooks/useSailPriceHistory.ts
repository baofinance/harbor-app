"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSailPriceGraphUrlOptional, getGraphHeaders } from "@/config/graph";
import { SAIL_CHART_HISTORY_DAYS } from "@/utils/sailChartTimeRange";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

const GENESIS_END_QUERY = `
  query GetGenesisEnd($genesisId: ID) {
    genesisEnd(id: $genesisId) {
      timestamp
    }
  }
`;

const PRICE_POINTS_PAGE_QUERY = `
  query GetPricePointsPage($tokenAddress: Bytes!, $since: BigInt!, $cursor: BigInt!) {
    sailTokenPricePoints(
      where: { tokenAddress: $tokenAddress, timestamp_gte: $since, timestamp_gt: $cursor }
      orderBy: timestamp
      orderDirection: asc
      first: ${PAGE_SIZE}
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
  }
`;

const HOURLY_SNAPSHOTS_PAGE_QUERY = `
  query GetHourlySnapshotsPage($tokenAddress: Bytes!, $since: BigInt!, $cursor: BigInt!) {
    hourlyPriceSnapshots(
      where: { tokenAddress: $tokenAddress, hourTimestamp_gte: $since, hourTimestamp_gt: $cursor }
      orderBy: hourTimestamp
      orderDirection: asc
      first: ${PAGE_SIZE}
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
  collateralPriceUSD: number;
  eventType: string;
  impliedPrice?: number;
}

export interface HourlySnapshot {
  timestamp: number;
  priceUSD: number;
  collateralPriceUSD: number;
  totalSupply: string;
  collateralBalance: string;
  leverageRatio: number;
  collateralRatio: number;
}

export interface MergedChartPoint {
  timestamp: number;
  priceUSD: number;
  collateralPriceUSD: number;
  source: "event" | "hourly";
}

interface PriceHistoryData {
  pricePoints: PricePoint[];
  hourlySnapshots: HourlySnapshot[];
  isLoading: boolean;
  error: string | null;
}

interface UseSailPriceHistoryOptions {
  tokenAddress: string;
  genesisAddress?: string;
  sinceGenesisEnd?: boolean;
  daysBack?: number;
  enabled?: boolean;
}

async function postGraphql<T>(
  graphUrl: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(graphUrl, {
    method: "POST",
    headers: getGraphHeaders(graphUrl),
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GraphQL query failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`,
    );
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

function mapPricePoint(p: {
  timestamp: string;
  tokenPriceUSD: string;
  collateralPriceUSD: string;
  eventType: string;
  impliedTokenPrice?: string | null;
}): PricePoint {
  return {
    timestamp: parseInt(p.timestamp, 10),
    priceUSD: parseFloat(p.tokenPriceUSD),
    collateralPriceUSD: parseFloat(p.collateralPriceUSD),
    eventType: p.eventType,
    impliedPrice: p.impliedTokenPrice ? parseFloat(p.impliedTokenPrice) : undefined,
  };
}

function mapHourlySnapshot(s: {
  hourTimestamp: string;
  tokenPriceUSD: string;
  collateralPriceUSD: string;
  totalSupply: string;
  collateralBalance: string;
  leverageRatio: string;
  collateralRatio: string;
}): HourlySnapshot {
  return {
    timestamp: parseInt(s.hourTimestamp, 10),
    priceUSD: parseFloat(s.tokenPriceUSD),
    collateralPriceUSD: parseFloat(s.collateralPriceUSD),
    totalSupply: s.totalSupply,
    collateralBalance: s.collateralBalance,
    leverageRatio: parseFloat(s.leverageRatio) / 1e18,
    collateralRatio: parseFloat(s.collateralRatio) / 1e18,
  };
}

async function fetchAllPricePoints(
  graphUrl: string,
  tokenAddress: string,
  sinceTimestamp: number,
): Promise<PricePoint[]> {
  const all: PricePoint[] = [];
  let cursor = sinceTimestamp - 1;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await postGraphql<{
      sailTokenPricePoints: Parameters<typeof mapPricePoint>[0][];
    }>(graphUrl, PRICE_POINTS_PAGE_QUERY, {
      tokenAddress: tokenAddress.toLowerCase(),
      since: sinceTimestamp.toString(),
      cursor: cursor.toString(),
    });

    const batch = (data.sailTokenPricePoints ?? []).map(mapPricePoint);
    if (batch.length === 0) break;

    all.push(...batch);
    cursor = batch[batch.length - 1]!.timestamp;
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

async function fetchAllHourlySnapshots(
  graphUrl: string,
  tokenAddress: string,
  sinceTimestamp: number,
): Promise<HourlySnapshot[]> {
  const all: HourlySnapshot[] = [];
  let cursor = sinceTimestamp - 1;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await postGraphql<{
      hourlyPriceSnapshots: Parameters<typeof mapHourlySnapshot>[0][];
    }>(graphUrl, HOURLY_SNAPSHOTS_PAGE_QUERY, {
      tokenAddress: tokenAddress.toLowerCase(),
      since: sinceTimestamp.toString(),
      cursor: cursor.toString(),
    });

    const batch = (data.hourlyPriceSnapshots ?? []).map(mapHourlySnapshot);
    if (batch.length === 0) break;

    all.push(...batch);
    cursor = batch[batch.length - 1]!.timestamp;
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

export function useSailPriceHistory({
  tokenAddress,
  genesisAddress,
  sinceGenesisEnd = true,
  daysBack = SAIL_CHART_HISTORY_DAYS,
  enabled = true,
}: UseSailPriceHistoryOptions): PriceHistoryData {
  const graphUrl = getSailPriceGraphUrlOptional();
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
      if (!graphUrl) {
        return { pricePoints: [], hourlySnapshots: [] };
      }
      if (!tokenAddress) {
        return { pricePoints: [], hourlySnapshots: [] };
      }

      const token = tokenAddress.toLowerCase();

      const [genesisData, rawPricePoints, rawHourlySnapshots] = await Promise.all([
        genesisAddress
          ? postGraphql<{ genesisEnd?: { timestamp: string } | null }>(
              graphUrl,
              GENESIS_END_QUERY,
              { genesisId: genesisAddress.toLowerCase() },
            )
          : Promise.resolve(null),
        fetchAllPricePoints(graphUrl, token, sinceTimestamp),
        fetchAllHourlySnapshots(graphUrl, token, sinceTimestamp),
      ]);

      const genesisEndTs = genesisData?.genesisEnd?.timestamp
        ? parseInt(genesisData.genesisEnd.timestamp, 10)
        : null;

      const cutoffTs =
        sinceGenesisEnd && genesisEndTs && genesisEndTs > 0
          ? Math.max(sinceTimestamp, genesisEndTs)
          : sinceTimestamp;

      const pricePoints = rawPricePoints.filter((p) => p.timestamp >= cutoffTs);
      const hourlySnapshots = rawHourlySnapshots.filter(
        (s) => s.timestamp >= cutoffTs,
      );

      if (debug) {
        const authHeaderPresent = Boolean(getGraphHeaders(graphUrl)["Authorization"]);
        // eslint-disable-next-line no-console
        console.log("[useSailPriceHistory] subgraph response", {
          graphUrl,
          authHeaderPresent,
          tokenAddress: token,
          since: sinceTimestamp,
          genesisAddress,
          genesisEndTs,
          cutoffTs,
          pricePoints: pricePoints.length,
          hourlySnapshots: hourlySnapshots.length,
          samplePoint: pricePoints[0],
          sampleHourly: hourlySnapshots[0],
        });
      }

      return { pricePoints, hourlySnapshots };
    },
    enabled: enabled && !!tokenAddress && !!graphUrl,
    refetchInterval: 60000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    pricePoints: data?.pricePoints || [],
    hourlySnapshots: data?.hourlySnapshots || [],
    isLoading,
    error: !graphUrl && enabled && !!tokenAddress
      ? "Price data unavailable: Sail price subgraph URL is not configured."
      : error
        ? String(error)
        : null,
  };
}

// Helper to merge price points and hourly snapshots for continuous chart data
export function mergeChartData(
  pricePoints: PricePoint[],
  hourlySnapshots: HourlySnapshot[]
): MergedChartPoint[] {
  const merged: MergedChartPoint[] = [];

  // Add all price points
  for (const pp of pricePoints) {
    merged.push({
      timestamp: pp.timestamp,
      priceUSD: pp.priceUSD,
      collateralPriceUSD: pp.collateralPriceUSD,
      source: "event",
    });
  }

  // Add hourly snapshots (only if no event in that hour)
  for (const hs of hourlySnapshots) {
    const hourStart = hs.timestamp;
    const hourEnd = hourStart + 3600;

    // Check if any event exists in this hour
    const hasEventInHour = pricePoints.some(
      (pp) => pp.timestamp >= hourStart && pp.timestamp < hourEnd
    );

    if (!hasEventInHour) {
      merged.push({
        timestamp: hs.timestamp,
        priceUSD: hs.priceUSD,
        collateralPriceUSD: hs.collateralPriceUSD,
        source: "hourly",
      });
    }
  }

  // Sort by timestamp
  merged.sort((a, b) => a.timestamp - b.timestamp);

  return merged;
}

