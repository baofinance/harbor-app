"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisVoyageRewardsCard } from "./GenesisVoyageRewardsCard";

export type GenesisMaidenVoyageMainGridProps = {
  activeCard: GenesisActiveVoyageCardProps | null;
};

export function GenesisMaidenVoyageMainGrid({
  activeCard,
}: GenesisMaidenVoyageMainGridProps) {
  return (
    <section
      id="maiden-voyage-active"
      className="mb-8 scroll-mt-24 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6"
      aria-label="Active Maiden Voyage campaign"
    >
      <div className="min-w-0 lg:relative">
        {activeCard ? (
          <div className="lg:absolute lg:inset-x-0 lg:bottom-0">
            <GenesisActiveVoyageCard {...activeCard} />
          </div>
        ) : null}
      </div>
      <aside className="min-w-0">
        {activeCard ? (
          <GenesisVoyageRewardsCard
            endDate={activeCard.endDate}
            voyageStatus={activeCard.voyageStatus}
          />
        ) : null}
      </aside>
    </section>
  );
}
