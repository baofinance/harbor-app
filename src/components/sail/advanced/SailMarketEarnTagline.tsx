"use client";

import type { DefinedMarket } from "@/config/markets";
import { MV_ACCENT_GRADIENT } from "@/components/genesis/maidenVoyageLayoutStyles";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

const SAIL_EARN_TAGLINE_CLASS =
  "min-w-0 flex-1 text-lg font-medium leading-snug text-white/85 sm:text-xl lg:text-2xl";
const SAIL_EARN_TAGLINE_HIGHLIGHT_CLASS = `font-semibold ${MV_ACCENT_GRADIENT}`;

type SailMarketEarnTaglineProps = {
  market: DefinedMarket;
  className?: string;
};

/** Header tagline beside the market dropdown — long side mint, short side coral. */
export function SailMarketEarnTagline({
  market,
  className = "",
}: SailMarketEarnTaglineProps) {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(market, "", "");

  return (
    <p className={`${SAIL_EARN_TAGLINE_CLASS} ${className}`.trim()}>
      Earn amplified returns if{" "}
      <span className={SAIL_EARN_TAGLINE_HIGHLIGHT_CLASS}>{longLabel}</span> outperforms{" "}
      <span className={SAIL_EARN_TAGLINE_HIGHLIGHT_CLASS}>{shortLabel}</span>.
    </p>
  );
}
