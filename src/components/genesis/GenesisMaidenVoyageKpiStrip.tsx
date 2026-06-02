"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageKpiStripProps = {
  stats: MaidenVoyageStatsBarData;
  compact?: boolean;
};

export function GenesisMaidenVoyageKpiStrip({
  stats,
  compact = false,
}: GenesisMaidenVoyageKpiStripProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 ${
        compact ? "min-w-[360px]" : ""
      }`}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Featured TVL
          </p>
          <p className="font-mono text-base font-semibold text-white/90">
            {stats.featuredTvlLabel ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Markets launched
          </p>
          <p className="font-mono text-base font-semibold text-white/90">
            {stats.completedLaunchesCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Maiden Voyages
          </p>
          <p className="font-mono text-base font-semibold text-white/90">
            {stats.voyageNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
