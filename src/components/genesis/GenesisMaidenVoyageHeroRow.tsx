"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageUtilityRail } from "./GenesisMaidenVoyageUtilityRail";
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
      className="mb-6 scroll-mt-24 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center lg:gap-8"
      aria-label="Active Maiden Voyage campaign"
    >
      <div className="order-1 flex flex-col lg:order-none">
        <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
        <GenesisHowItWorksSteps />
      </div>
      <div className="order-2 space-y-3 lg:order-none">
        <GenesisMaidenVoyageUtilityRail stats={stats} />
        {activeCard ? <GenesisActiveVoyageCard {...activeCard} /> : null}
      </div>
    </section>
  );
}
