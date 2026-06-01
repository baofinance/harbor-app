"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";

export type GenesisMaidenVoyageHeroRowProps = {
  activeCard: GenesisActiveVoyageCardProps | null;
};

export function GenesisMaidenVoyageHeroRow({
  activeCard,
}: GenesisMaidenVoyageHeroRowProps) {
  return (
    <section
      id="maiden-voyage-active"
      className="mb-8 scroll-mt-24 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center lg:gap-8"
      aria-label="Active Maiden Voyage campaign"
    >
      <div className="order-1 flex flex-col lg:order-none">
        <GenesisMaidenVoyageHeroCopy />
        <GenesisHowItWorksSteps />
      </div>
      <div className="order-2 lg:order-none">
        {activeCard ? <GenesisActiveVoyageCard {...activeCard} /> : null}
      </div>
    </section>
  );
}
