"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisMaidenVoyageSidebarStats } from "./GenesisMaidenVoyageSidebarStats";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";
import { GenesisVoyageRewardsCard } from "./GenesisVoyageRewardsCard";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageMainGridProps = {
  stats: MaidenVoyageStatsBarData;
  activeCard: GenesisActiveVoyageCardProps | null;
};

export function GenesisMaidenVoyageMainGrid({
  stats,
  activeCard,
}: GenesisMaidenVoyageMainGridProps) {
  return (
    <section
      id="maiden-voyage-active"
      className="mb-8 scroll-mt-24 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-6"
      aria-label="Active Maiden Voyage campaign"
    >
      <div className="min-w-0">
        {activeCard ? (
          <GenesisActiveVoyageCard {...activeCard} />
        ) : null}
      </div>
      <aside className="flex flex-col gap-3">
        <GenesisMaidenVoyageSidebarStats stats={stats} />
        <GenesisMaidenVoyageWhyJoinCard />
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
