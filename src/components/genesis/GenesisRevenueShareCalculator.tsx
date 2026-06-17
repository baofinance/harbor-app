"use client";

import { useMemo, useState } from "react";
import {
  REVENUE_SHARE_CALC_DEFAULTS,
  REVENUE_SHARE_CALC_MILESTONE_TVLS_USD,
  buildDefaultMarketAssumptions,
  closestMilestoneIndex,
  computeUpsideAtTvl,
  computeUpsideMilestones,
  type RevenueShareMarketAssumptions,
} from "@/utils/maidenVoyageRevenueShareCalculator";
import {
  estimateMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import { formatUSD } from "@/utils/formatters";
import { GenesisUpsideAdvancedAssumptions } from "./GenesisUpsideAdvancedAssumptions";
import { GenesisUpsideGrowthChart } from "./GenesisUpsideGrowthChart";
import { GenesisUpsideHeroMetrics } from "./GenesisUpsideHeroMetrics";
import { GenesisUpsideMilestoneTable } from "./GenesisUpsideMilestoneTable";
import { GenesisUpsideSummaryStats } from "./GenesisUpsideSummaryStats";
import {
  MV_CAPTION_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
} from "./maidenVoyageLayoutStyles";

export type GenesisRevenueShareCalculatorProps = {
  capUsd: number | null;
  yieldRevSharePct: number | null;
  initialDepositUsd: number;
  className?: string;
};

function clampDeposit(value: number, capUsd: number | null): number {
  const max = capUsd ?? 10_000_000;
  return Math.min(max, Math.max(0, value));
}

export function GenesisRevenueShareCalculator({
  capUsd,
  yieldRevSharePct,
  initialDepositUsd,
  className = "",
}: GenesisRevenueShareCalculatorProps) {
  const [projectedTvlUsd, setProjectedTvlUsd] = useState(
    () => REVENUE_SHARE_CALC_DEFAULTS.tvlUsd,
  );
  const [assumptions, setAssumptions] = useState<RevenueShareMarketAssumptions>(
    buildDefaultMarketAssumptions,
  );
  const [depositUsd, setDepositUsd] = useState(initialDepositUsd);

  const yourSharePct = useMemo(() => {
    const pct = estimateMaidenVoyageYieldSharePct({
      depositUsd,
      capUsd,
      yieldRevSharePct,
    });
    return pct ?? 0;
  }, [depositUsd, capUsd, yieldRevSharePct]);

  const selected = useMemo(
    () => computeUpsideAtTvl(projectedTvlUsd, assumptions, yourSharePct, depositUsd),
    [projectedTvlUsd, assumptions, yourSharePct, depositUsd],
  );

  const milestones = useMemo(
    () =>
      computeUpsideMilestones(
        REVENUE_SHARE_CALC_MILESTONE_TVLS_USD,
        assumptions,
        yourSharePct,
        depositUsd,
        projectedTvlUsd,
      ),
    [assumptions, yourSharePct, depositUsd, projectedTvlUsd],
  );

  const highlightedMilestoneIndex = useMemo(
    () => closestMilestoneIndex(REVENUE_SHARE_CALC_MILESTONE_TVLS_USD, projectedTvlUsd),
    [projectedTvlUsd],
  );

  const milestoneAprCallouts = useMemo(() => {
    const targets = [10_000_000, 25_000_000] as const;
    return targets.map((tvlUsd) => {
      const row = milestones.find((m) => m.tvlUsd === tvlUsd);
      return {
        tvlLabel: formatUSD(tvlUsd, { compact: true, minDecimals: 0, maxDecimals: 0 }),
        foreverAprPct: row?.foreverAprPct ?? null,
      };
    });
  }, [milestones]);

  const setAssumption = <K extends keyof RevenueShareMarketAssumptions>(
    key: K,
    value: RevenueShareMarketAssumptions[K],
  ) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} w-full px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
      aria-label="Explore the upside"
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white/90 sm:text-base">
          Explore the Upside
        </h2>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>
          If this market grows, what could your founding share be worth?
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <GenesisUpsideHeroMetrics
          depositUsd={depositUsd}
          capUsd={capUsd}
          yourSharePct={yourSharePct}
          annualEarningsUsd={selected.yourEstimatedRevenue}
          onDepositChange={(v) => setDepositUsd(clampDeposit(v, capUsd))}
        />

        <GenesisUpsideSummaryStats
          marketRevenuePerYear={selected.totalMarketRevenue}
          yourSharePct={yourSharePct}
          annualEarningsUsd={selected.yourEstimatedRevenue}
          foreverAprPct={selected.foreverAprPct}
          milestoneAprCallouts={milestoneAprCallouts}
        />

        <GenesisUpsideMilestoneTable
          rows={milestones}
          highlightedIndex={highlightedMilestoneIndex}
        />

        <GenesisUpsideGrowthChart rows={milestones} />

        <GenesisUpsideAdvancedAssumptions
          projectedTvlUsd={projectedTvlUsd}
          revenueRatePct={selected.revenueRatePct}
          depositUsd={depositUsd}
          assumptions={assumptions}
          selectedResult={selected}
          onProjectedTvlChange={setProjectedTvlUsd}
          onAssumptionChange={setAssumption}
        />
      </div>
    </section>
  );
}
