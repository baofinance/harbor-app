"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { MV_STAT_TILE } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageSidebarStatsProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageSidebarStats({
  stats,
}: GenesisMaidenVoyageSidebarStatsProps) {
  return (
    <section
      className="grid grid-cols-3 gap-2"
      aria-label="Maiden Voyage overview statistics"
    >
      <div className={`${MV_STAT_TILE} px-3 py-2.5 sm:px-4 sm:py-3`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Total TVL
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
          {stats.featuredTvlLabel}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-3 py-2.5 sm:px-4 sm:py-3`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Markets launched
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
          {stats.completedLaunchesCount}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-3 py-2.5 sm:px-4 sm:py-3`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Maiden Voyages
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
          {stats.voyageNumber}
        </p>
      </div>
    </section>
  );
}
