"use client";

import { GenesisHowItWorksSteps } from "./GenesisHowItWorksSteps";
import { GenesisMaidenVoyageHeroCopy } from "./GenesisMaidenVoyageHeroCopy";

export type GenesisMaidenVoyageHeroBandProps = {
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroBand({
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroBandProps) {
  return (
    <section className="mb-6" aria-label="Maiden Voyage introduction">
      <GenesisMaidenVoyageHeroCopy yieldRevSharePct={yieldRevSharePct} />
      <GenesisHowItWorksSteps />
    </section>
  );
}
