"use client";

import { resolveRevenueShareCalculatorProps } from "@/utils/maidenVoyageYieldShareEstimate";
import type { GenesisActiveVoyageCardProps } from "./GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "./GenesisActiveVoyageCard";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";
import { GenesisRevenueShareCalculator } from "./GenesisRevenueShareCalculator";
import { GenesisVoyageRewardsCard } from "./GenesisVoyageRewardsCard";

export type GenesisMaidenVoyageFeaturedSectionProps = {
  yieldRevSharePct?: number | null;
  activeCard: GenesisActiveVoyageCardProps | null;
};

/**
 * Campaign grid (lg+):
 *   hero copy        | how-it-works
 *   active voyage    | why join + what you receive (stacked, same height)
 */
export function GenesisMaidenVoyageFeaturedSection({
  yieldRevSharePct = null,
  activeCard,
}: GenesisMaidenVoyageFeaturedSectionProps) {
  const showCalculator =
    activeCard != null &&
    !activeCard.capLoading &&
    !activeCard.capUnavailable &&
    activeCard.capDisplay != null;

  const calculatorProps = showCalculator
    ? resolveRevenueShareCalculatorProps({
        capDisplay: activeCard.capDisplay!,
        genesisAddress: activeCard.genesisAddress,
        yieldRevSharePct: activeCard.yieldRevSharePct,
        userDepositUsd: activeCard.userDepositUsd,
      })
    : null;

  return (
    <section
      id="maiden-voyage-active"
      className="mb-8 scroll-mt-24 space-y-4"
      aria-label="Maiden Voyage campaign"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,auto)] lg:items-stretch lg:gap-x-6 lg:gap-y-4">
      <div className="flex w-full min-w-0 lg:col-start-1 lg:row-start-1">
        <GenesisMaidenVoyageHeroCopy
          yieldRevSharePct={yieldRevSharePct}
          density="compact"
        />
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <GenesisHowItWorksSteps variant="sidebarCard" />
      </div>

      {activeCard ? (
        <div className="flex min-h-0 min-w-0 lg:col-start-1 lg:row-start-2">
          <GenesisActiveVoyageCard {...activeCard} className="h-full w-full" />
        </div>
      ) : null}

      <div
        className={`flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2 ${
          activeCard ? "min-h-0 lg:h-full" : ""
        }`}
      >
        <GenesisMaidenVoyageWhyJoinCard className="shrink-0" />
        {activeCard ? (
          <GenesisVoyageRewardsCard className="min-h-0 flex-1" />
        ) : null}
      </div>
      </div>

      {calculatorProps ? (
        <GenesisRevenueShareCalculator
          capUsd={calculatorProps.capUsd}
          yieldRevSharePct={calculatorProps.yieldRevSharePct}
          initialDepositUsd={calculatorProps.initialDepositUsd}
        />
      ) : null}
    </section>
  );
}
