"use client";

import { getFeaturedVoyageNumber } from "@/config/maidenVoyageFeatured";
import { MV_HEADLINE, MV_HEADLINE_ACCENT, MV_HEADLINE_PRIMARY } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageHeroCopyProps = {
  yieldRevSharePct?: number | null;
};

export function GenesisMaidenVoyageHeroCopy({
  yieldRevSharePct = null,
}: GenesisMaidenVoyageHeroCopyProps) {
  return (
    <div className="flex flex-col justify-center [container-type:inline-size]">
      <h1 className={MV_HEADLINE}>
        <span className={MV_HEADLINE_PRIMARY}>Own a piece of the market.</span>
        <span className={MV_HEADLINE_ACCENT}>Earn forever.</span>
      </h1>
      {yieldRevSharePct != null ? (
        <p className="mt-4 max-w-lg text-base font-medium leading-snug text-white/70 sm:text-lg">
          Help bootstrap a market and earn{" "}
          <span className="text-[#FF8A7A]">{yieldRevSharePct}%</span> of its
          revenue forever.
        </p>
      ) : (
        <p className="mt-4 max-w-lg text-base font-medium leading-snug text-white/70 sm:text-lg">
          Help bootstrap a market. Earn from it forever.
        </p>
      )}
      <p className="sr-only">
        Active campaign: Maiden Voyage #{getFeaturedVoyageNumber()}
      </p>
    </div>
  );
}
