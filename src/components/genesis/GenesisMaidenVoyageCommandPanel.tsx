"use client";

import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisMaidenVoyageKpiStrip } from "./GenesisMaidenVoyageKpiStrip";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
} from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageCommandPanelProps = {
  stats: MaidenVoyageStatsBarData;
  activeCard: GenesisActiveVoyageCardProps | null;
};

export function GenesisMaidenVoyageCommandPanel({
  stats,
  activeCard,
}: GenesisMaidenVoyageCommandPanelProps) {
  if (!activeCard) return null;

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="Active maiden voyage"
    >
      <div className="border-b border-white/10 px-4 py-3 md:hidden">
        <GenesisMaidenVoyageKpiStrip stats={stats} variant="card" />
      </div>
      <GenesisActiveVoyageCard {...activeCard} embedded />
    </section>
  );
}
