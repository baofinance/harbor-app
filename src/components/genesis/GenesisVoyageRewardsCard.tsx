"use client";

import { GenesisVoyageBenefitsWithLayout } from "./GenesisVoyageBenefits";
import { MV_CARD_INNER_GRADIENT, MV_CARD_SHELL } from "./maidenVoyageLayoutStyles";

export function GenesisVoyageRewardsCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} flex flex-col overflow-hidden ${className}`}
      aria-label="What you receive"
    >
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
        <GenesisVoyageBenefitsWithLayout layout="listFlat" />
      </div>
    </section>
  );
}
