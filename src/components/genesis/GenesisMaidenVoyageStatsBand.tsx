"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { MV_STATS_BAND } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageStatsBandProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageStatsBand({
  stats,
}: GenesisMaidenVoyageStatsBandProps) {
  return (
    <section
      className={`${MV_STATS_BAND} mb-4 hidden md:block`}
      aria-label="Maiden Voyage overview statistics"
    >
      <div className="grid grid-cols-3 gap-4 px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Featured TVL
          </p>
          <p className="font-mono text-base font-semibold text-white/90">
            {stats.featuredTvlLabel}
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
    </section>
  );
}
