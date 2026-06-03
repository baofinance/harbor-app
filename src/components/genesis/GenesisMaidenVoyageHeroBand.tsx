"use client";

import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";

export type GenesisMaidenVoyageHeroBandProps = {
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroBand({
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroBandProps) {
  return (
    <section
      className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-6"
      aria-label="Maiden Voyage introduction"
    >
      <div className="min-w-0">
        <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
      </div>
      <aside className="flex flex-col gap-3">
        <GenesisHowItWorksSteps variant="sidebarCard" />
        <GenesisMaidenVoyageWhyJoinCard />
      </aside>
    </section>
  );
}
