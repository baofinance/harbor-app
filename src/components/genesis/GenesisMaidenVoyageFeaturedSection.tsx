"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";
import { GenesisVoyageRewardsCard } from "./GenesisVoyageRewardsCard";
import { MV_SIDEBAR_STACK } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageFeaturedSectionProps = {
  yieldRevSharePct?: number | null;
  activeCard: GenesisActiveVoyageCardProps | null;
};

/** Hero + active voyage + right rail in one grid so sidebar card gaps stay uniform. */
export function GenesisMaidenVoyageFeaturedSection({
  yieldRevSharePct = null,
  activeCard,
}: GenesisMaidenVoyageFeaturedSectionProps) {
  return (
    <section
      id="maiden-voyage-active"
      className="mb-8 scroll-mt-24 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6"
      aria-label="Maiden Voyage campaign"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
        <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
        {activeCard ? (
          <div className="min-w-0 lg:mt-auto">
            <GenesisActiveVoyageCard {...activeCard} />
          </div>
        ) : null}
      </div>
      <aside className={MV_SIDEBAR_STACK}>
        <GenesisHowItWorksSteps variant="sidebarCard" />
        <GenesisMaidenVoyageWhyJoinCard />
        {activeCard ? <GenesisVoyageRewardsCard /> : null}
      </aside>
    </section>
  );
}
