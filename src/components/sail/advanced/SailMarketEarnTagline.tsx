"use client";

import type { DefinedMarket } from "@/config/markets";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

const SAIL_EARN_TAGLINE_CLASS =
  "min-w-0 text-center text-xl font-bold leading-snug text-white/85 sm:text-2xl lg:text-3xl";
const SAIL_EARN_TAGLINE_LONG_CLASS = "font-extrabold text-[#6bc4a8]";
const SAIL_EARN_TAGLINE_SHORT_CLASS = "font-extrabold text-[#FF8A7A]";
const SAIL_EARN_PERKS_CLASS =
  "mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70 sm:text-sm";
const SAIL_EARN_PERK_PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1";

const SAIL_EARN_PERKS = [
  "Automatically adjusting leverage",
  "No Funding Fees",
  "No Margin management",
] as const;

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
    <div className={`min-w-0 ${className}`.trim()}>
      <p className={SAIL_EARN_TAGLINE_CLASS}>
        Earn amplified returns if{" "}
        <span className={SAIL_EARN_TAGLINE_LONG_CLASS}>{longLabel}</span>{" "}
        outperforms{" "}
        <span className={SAIL_EARN_TAGLINE_SHORT_CLASS}>{shortLabel}</span>.
      </p>
      <ul className={SAIL_EARN_PERKS_CLASS}>
        {SAIL_EARN_PERKS.map((label) => (
          <li key={label} className={SAIL_EARN_PERK_PILL_CLASS}>
            <span className="text-[#6bc4a8]" aria-hidden="true">
              ✓
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
