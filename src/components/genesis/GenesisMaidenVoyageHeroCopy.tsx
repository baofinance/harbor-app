"use client";

import { getFeaturedVoyageNumber } from "@/config/maidenVoyageFeatured";
import { MV_ACCENT_GRADIENT, MV_HEADLINE } from "./maidenVoyageLayoutStyles";

export function GenesisMaidenVoyageHeroCopy() {
  return (
    <div className="flex flex-col justify-center">
      <h1 className={MV_HEADLINE}>
        <span className="block">Own a piece of the market.</span>
        <span className={`mt-1 block ${MV_ACCENT_GRADIENT}`}>Earn forever.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base font-medium leading-snug text-white/70 sm:text-lg">
        Help bootstrap a market. Earn from it forever.
      </p>
      <p className="sr-only">
        Active campaign: Maiden Voyage #{getFeaturedVoyageNumber()}
      </p>
    </div>
  );
}
