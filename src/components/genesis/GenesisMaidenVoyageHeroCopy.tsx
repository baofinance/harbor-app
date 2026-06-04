"use client";

import { getFeaturedVoyageNumber } from "@/config/maidenVoyageFeatured";
import { MV_HEADLINE, MV_HEADLINE_ACCENT, MV_HEADLINE_PRIMARY, MV_SUBHEAD, MV_SUBHEAD_ACCENT } from "./maidenVoyageLayoutStyles";

export type GenesisMaidenVoyageHeroCopyProps = {
  yieldRevSharePct?: number | null;
  /** Tighter vertical rhythm when paired with the how-it-works card (desktop grid). */
  density?: "default" | "compact";
};

export function GenesisMaidenVoyageHeroCopy({
  yieldRevSharePct = null,
  density = "default",
}: GenesisMaidenVoyageHeroCopyProps) {
  const compact = density === "compact";

  return (
    <div
      className={`flex w-full min-w-0 flex-col justify-center [container-type:inline-size] ${
        compact
          ? "pt-4 sm:pt-6 lg:h-full lg:justify-center lg:pt-0"
          : "pt-4 sm:pt-6"
      }`}
    >
      <h1 className={MV_HEADLINE}>
        <span className={MV_HEADLINE_PRIMARY}>Own a piece of the market.</span>
        <span
          className={`${MV_HEADLINE_ACCENT} ${compact ? "lg:mt-0.5" : ""}`}
        >
          Earn forever.
        </span>
      </h1>
      {yieldRevSharePct != null ? (
        <p className={`${MV_SUBHEAD} ${compact ? "lg:mt-2.5" : ""}`}>
          Help bootstrap a market and earn{" "}
          <span className={MV_SUBHEAD_ACCENT}>{yieldRevSharePct}%</span> of its
          revenue forever.
        </p>
      ) : (
        <p className={`${MV_SUBHEAD} ${compact ? "lg:mt-2.5" : ""}`}>
          Help bootstrap a market. Earn from it forever.
        </p>
      )}
      <p className="sr-only">
        Active campaign: Maiden Voyage #{getFeaturedVoyageNumber()}
      </p>
    </div>
  );
}
