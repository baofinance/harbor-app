"use client";

import { GenesisMaidenVoyagePageHeader } from "./GenesisMaidenVoyagePageHeader";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";
import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";

/** Legacy composite hero — prefer GenesisMaidenVoyagePageHeader + HeroRow on index. */
export function GenesisCampaignHero() {
  return (
    <div className="mb-6 flex flex-col">
      <GenesisMaidenVoyagePageHeader />
      <GenesisMaidenVoyageHeroCopy yieldRevSharePct={null} />
      <GenesisHowItWorksSteps />
    </div>
  );
}
