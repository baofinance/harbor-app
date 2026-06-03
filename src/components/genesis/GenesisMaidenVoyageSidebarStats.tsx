"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { MV_CARD_INNER_GRADIENT, MV_CARD_SHELL } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageSidebarStatsProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageSidebarStats({
  stats,
}: GenesisMaidenVoyageSidebarStatsProps) {
  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3 sm:px-5 sm:py-4`}
      aria-label="Maiden Voyage overview statistics"
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Total TVL
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
            {stats.featuredTvlLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Markets launched
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
            {stats.completedLaunchesCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Maiden Voyages
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-base">
            {stats.voyageNumber}
          </p>
        </div>
      </div>
    </section>
  );
}
