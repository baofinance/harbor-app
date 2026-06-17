"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import { markets } from "@/config/markets";
import { useGenesisPageData } from "@/hooks/useGenesisPageData";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import {
  buildAchievements,
  buildFoundingMarkets,
  buildJourneyMetrics,
  buildOpportunities,
  buildPortfolioHealth,
  buildRevenuePeriods,
  buildRevenueSparkline,
  buildTimelineEvents,
  buildWelcomeHighlights,
  buildYieldHubSnapshot,
  type MarksParticipation,
  type YieldDistributionEvent,
} from "./dashboardEngagementUtils";

type UseDashboardEngagementParams = {
  yieldRows: FounderMetricRow[];
  maidenRows: DashboardPositionRow[];
  archivedRows: DashboardPositionRow[];
  allPositionRows: DashboardPositionRow[];
  activeVoyage: DashboardActiveVoyageSnapshot | null;
  positionTotals: { maiden: number; earn: number; sail: number; archived: number };
  totalEarned: number;
  totalOutstanding: number;
  onClaim?: () => void;
  onYieldDetails?: () => void;
};

export function useDashboardEngagement(params: UseDashboardEngagementParams) {
  const { address, isConnected } = useAccount();
  const { genesisMarkets, marksResults, getMarketName } = useGenesisPageData();
  const [yieldEvents, setYieldEvents] = useState<YieldDistributionEvent[]>([]);

  const founderMarkets = useMemo(() => {
    return Object.entries(markets)
      .map(([id, m]) => {
        const genesis = (m as { addresses?: { genesis?: string } }).addresses?.genesis;
        if (!genesis || !isAddress(genesis)) return null;
        return { id, genesis: genesis as Address };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setYieldEvents([]);
      return;
    }
    const wallet = address.toLowerCase();
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/founder-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            genesises: founderMarkets.map((m) => m.genesis),
          }),
        });
        const json = (await res.json()) as {
          yieldEvents?: YieldDistributionEvent[];
        };
        setYieldEvents(json.yieldEvents ?? []);
      } catch {
        setYieldEvents([]);
      }
    })();
  }, [isConnected, address, founderMarkets]);

  const marksParticipation = useMemo((): MarksParticipation[] => {
    return (marksResults ?? []).map((r) => {
      const marks = r.data?.userHarborMarks;
      const genesisAddress = r.genesisAddress ?? "";
      const market = genesisMarkets.find(
        ([, mkt]) =>
          (mkt as { addresses?: { genesis?: string } }).addresses?.genesis?.toLowerCase() ===
          genesisAddress.toLowerCase(),
      );
      const marketLabel = market
        ? formatGenesisMarketDisplayName(
            getMarketName(genesisAddress) ||
              (market[1] as { name?: string }).name ||
              market[0],
          )
        : getMarketName(genesisAddress);

      return {
        genesisAddress,
        marketLabel,
        genesisStartDate: marks?.genesisStartDate
          ? Number.parseInt(marks.genesisStartDate, 10)
          : null,
        genesisEnded: Boolean(marks?.genesisEnded),
        boostMultiplier: Number.parseFloat(marks?.maidenVoyageBoostMultiplier || "1") || 1,
        maxBoost: Number.parseFloat(marks?.maidenVoyageMaxBoost || "5") || 5,
        ownershipSharePct:
          Number.parseFloat(marks?.finalMaidenVoyageOwnershipShare || "0") || 0,
        currentDepositUsd: Number.parseFloat(marks?.currentDepositUSD || "0") || 0,
      };
    });
  }, [marksResults, genesisMarkets, getMarketName]);

  const marksDeposits = useMemo(() => {
    const out: Array<{ label: string; usd: number; timestamp: number }> = [];
    for (const r of marksResults ?? []) {
      const deposits = r.data?.deposits ?? [];
      const label = getMarketName(r.genesisAddress ?? "");
      for (const d of deposits) {
        const ts = Number.parseInt(d.timestamp, 10);
        const usd = Number.parseFloat(d.amountUSD || "0");
        if (ts > 0 && usd > 0) {
          out.push({ label, usd, timestamp: ts });
        }
      }
    }
    return out;
  }, [marksResults, getMarketName]);

  const input = useMemo(
    () => ({
      yieldRows: params.yieldRows,
      yieldEvents,
      marksParticipation,
      maidenRows: params.maidenRows,
      archivedRows: params.archivedRows,
      allPositionRows: params.allPositionRows,
      activeVoyage: params.activeVoyage,
      positionTotals: params.positionTotals,
      totalEarned: params.totalEarned,
      totalOutstanding: params.totalOutstanding,
    }),
    [params, yieldEvents, marksParticipation],
  );

  const yieldHub = useMemo(() => buildYieldHubSnapshot(input), [input]);
  const revenuePeriods = useMemo(
    () => buildRevenuePeriods(yieldEvents, params.totalEarned),
    [yieldEvents, params.totalEarned],
  );
  const revenueSparkline = useMemo(
    () => buildRevenueSparkline(yieldEvents),
    [yieldEvents],
  );
  const founding = useMemo(() => buildFoundingMarkets(input), [input]);
  const achievements = useMemo(() => buildAchievements(input), [input]);
  const timeline = useMemo(
    () => buildTimelineEvents(input, marksDeposits),
    [input, marksDeposits],
  );
  const journey = useMemo(() => buildJourneyMetrics(input), [input]);
  const health = useMemo(() => buildPortfolioHealth(input), [input]);
  const opportunities = useMemo(
    () =>
      buildOpportunities(input, {
        onClaim: params.onClaim,
        onYieldDetails: params.onYieldDetails,
      }),
    [input, params.onClaim, params.onYieldDetails],
  );
  const welcome = useMemo(() => buildWelcomeHighlights(input), [input]);

  return {
    yieldHub,
    revenuePeriods,
    revenueSparkline,
    founding,
    achievements,
    timeline,
    journey,
    health,
    opportunities,
    welcome,
  };
}
