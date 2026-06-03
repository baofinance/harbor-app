"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { MV_STAT_TILE } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageStatsBandProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageStatsBand({
  stats,
}: GenesisMaidenVoyageStatsBandProps) {
  return (
    <section
      className="mb-4 hidden gap-2 md:grid md:grid-cols-3"
      aria-label="Maiden Voyage overview statistics"
    >
      <div className={`${MV_STAT_TILE} px-4 py-3 sm:px-5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Featured TVL
        </p>
        <p className="font-mono text-base font-semibold text-white/90">
          {stats.featuredTvlLabel}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-4 py-3 sm:px-5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Markets launched
        </p>
        <p className="font-mono text-base font-semibold text-white/90">
          {stats.completedLaunchesCount}
        </p>
      </div>
      <div className={`${MV_STAT_TILE} px-4 py-3 sm:px-5`}>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Maiden Voyages
        </p>
        <p className="font-mono text-base font-semibold text-white/90">
          {stats.voyageNumber}
        </p>
      </div>
    </section>
  );
}
