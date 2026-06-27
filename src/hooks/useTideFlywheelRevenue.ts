"use client";

import { useQuery } from "@tanstack/react-query";
import { getGraphHeaders, getGraphUrl } from "@/config/graph";
import {
  buildTideFlywheelRevenueEstimate,
  type TideFlywheelRevenueEstimate,
} from "@/utils/tideFlywheelRevenue";

const TIDE_FLYWHEEL_REVENUE_QUERY = `
  query TideFlywheelRevenue($skip: Int!) {
    maidenVoyageYieldGlobals(first: 500, skip: $skip) {
      cumulativeYieldUSD
    }
  }
`;

type GraphRow = { cumulativeYieldUSD?: string | null };

async function fetchAllMaidenYieldGlobals(): Promise<
  Array<string | null | undefined>
> {
  const graphUrl = getGraphUrl();
  const values: Array<string | null | undefined> = [];
  let skip = 0;

  for (;;) {
    const res = await fetch(graphUrl, {
      method: "POST",
      headers: getGraphHeaders(graphUrl),
      body: JSON.stringify({
        query: TIDE_FLYWHEEL_REVENUE_QUERY,
        variables: { skip },
      }),
    });
    const json = (await res.json()) as {
      errors?: Array<{ message?: string }>;
      data?: { maidenVoyageYieldGlobals?: GraphRow[] };
    };
    if (json.errors?.length) {
      throw new Error(
        json.errors.map((e) => e.message).filter(Boolean).join("; ") ||
          "Graph failed",
      );
    }
    const chunk = json.data?.maidenVoyageYieldGlobals ?? [];
    for (const row of chunk) {
      values.push(row.cumulativeYieldUSD);
    }
    if (chunk.length < 500) break;
    skip += 500;
  }

  return values;
}

export function useTideFlywheelRevenue() {
  const query = useQuery({
    queryKey: ["tide-flywheel-revenue"],
    queryFn: fetchAllMaidenYieldGlobals,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const estimate: TideFlywheelRevenueEstimate | null = query.data
    ? buildTideFlywheelRevenueEstimate(query.data)
    : null;

  return {
    estimate,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
