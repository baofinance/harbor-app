"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { MV_STAT_TILE } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageKpiStripProps = {
  stats: MaidenVoyageStatsBarData;
  variant?: "card" | "inline";
};

function KpiMetrics({
  stats,
  compact,
}: {
  stats: MaidenVoyageStatsBarData;
  compact?: boolean;
}) {
  const tvlLabel = stats.featuredTvlLabel;
  return (
    <>
      <div className={`${MV_STAT_TILE} px-3 py-2.5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Featured TVL
        </p>
        <p
          className={`font-mono font-semibold text-white/90 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {tvlLabel}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-3 py-2.5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Markets launched
        </p>
        <p
          className={`font-mono font-semibold text-white/90 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {stats.completedLaunchesCount}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-3 py-2.5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Maiden Voyages
        </p>
        <p
          className={`font-mono font-semibold text-white/90 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {stats.voyageNumber}
        </p>
      </div>
    </>
  );
}

/** Mobile-only card KPIs at top of voyage command panel. */
export function GenesisMaidenVoyageKpiStrip({
  stats,
  variant = "card",
}: GenesisMaidenVoyageKpiStripProps) {
  if (variant === "inline") {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <KpiMetrics stats={stats} />
    </div>
  );
}
