"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageCommandPanel } from "./GenesisMaidenVoyageCommandPanel";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageHeroRowProps = {
  activeCard: GenesisActiveVoyageCardProps | null;
  stats: MaidenVoyageStatsBarData;
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroRow({
  activeCard,
  stats,
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroRowProps) {
  return (
    <section
      id="maiden-voyage-active"
      className="mb-4 scroll-mt-24 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-8"
      aria-label="Active Maiden Voyage campaign"
    >
      <div className="order-1 flex flex-col lg:order-none">
        <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
        <GenesisHowItWorksSteps />
      </div>
      <div className="order-2 space-y-3 lg:order-none">
        <GenesisMaidenVoyageWhyJoinCard />
        <GenesisMaidenVoyageCommandPanel stats={stats} activeCard={activeCard} />
      </div>
    </section>
  );
}
