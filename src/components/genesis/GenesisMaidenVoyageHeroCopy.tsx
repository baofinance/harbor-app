"use client";

import { getFeaturedVoyageNumber } from "@/config/maidenVoyageFeatured";
import { MV_HEADLINE, MV_HEADLINE_ACCENT, MV_HEADLINE_PRIMARY, MV_SUBHEAD, MV_SUBHEAD_ACCENT } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageHeroCopyProps = {
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroCopy({
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroCopyProps) {
  return (
    <div className="flex flex-col justify-center pt-4 sm:pt-6 [container-type:inline-size]">
      <h1 className={MV_HEADLINE}>
        <span className={MV_HEADLINE_PRIMARY}>Own a piece of the market.</span>
        <span className={MV_HEADLINE_ACCENT}>Earn forever.</span>
      </h1>
      {yieldRevSharePct != null ? (
        <p className={MV_SUBHEAD}>
          Help bootstrap a market and earn{" "}
          <span className={MV_SUBHEAD_ACCENT}>{yieldRevSharePct}%</span> of its
          revenue forever.
        </p>
      ) : (
        <p className={MV_SUBHEAD}>
          Help bootstrap a market. Earn from it forever.
        </p>
      )}
      <p className="sr-only">
        Active campaign: Maiden Voyage #{getFeaturedVoyageNumber()}
      </p>
    </div>
  );
}
