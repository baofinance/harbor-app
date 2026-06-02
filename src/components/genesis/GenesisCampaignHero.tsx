"use client";

import { GenesisMaidenVoyagePageHeader } from "./GenesisMaidenVoyagePageHeader";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";

/** Legacy composite hero — prefer GenesisMaidenVoyagePageHeader + HeroRow on index. */
export function GenesisCampaignHero() {
  return (
    <div className="mb-6 flex flex-col">
      <GenesisMaidenVoyagePageHeader
        stats={{
          featuredTvlUsd: null,
          featuredTvlLabel: null,
          voyageNumber: 0,
          completedLaunchesCount: 0,
        }}
      />
      <GenesisMaidenVoyageHeroCopy />
      <GenesisHowItWorksSteps />
    </div>
  );
}
