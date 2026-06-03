"use client";

import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageSidebarStats } from "./GenesisMaidenVoyageSidebarStats";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageHeroBandProps = {
  stats: MaidenVoyageStatsBarData;
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroBand({
  stats,
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroBandProps) {
  return (
    <section
      className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-6"
      aria-label="Maiden Voyage introduction"
    >
      <div className="min-w-0">
        <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
        <GenesisHowItWorksSteps />
      </div>
      <aside className="flex flex-col gap-3">
        <GenesisMaidenVoyageSidebarStats stats={stats} />
        <GenesisMaidenVoyageWhyJoinCard />
      </aside>
    </section>
  );
}
