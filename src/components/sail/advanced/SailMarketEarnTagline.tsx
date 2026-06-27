"use client";

import type { DefinedMarket } from "@/config/markets";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

const SAIL_EARN_TAGLINE_CLASS =
  "min-w-0 flex-1 text-base font-medium leading-snug text-white/85 sm:text-lg lg:text-xl";
const SAIL_EARN_TAGLINE_LONG_CLASS = "font-semibold text-harbor-mint";
const SAIL_EARN_TAGLINE_SHORT_CLASS = "font-semibold text-harbor-coral";

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
      <span className={SAIL_EARN_TAGLINE_LONG_CLASS}>{longLabel}</span> outperforms{" "}
      <span className={SAIL_EARN_TAGLINE_SHORT_CLASS}>{shortLabel}</span>.
    </p>
  );
}
