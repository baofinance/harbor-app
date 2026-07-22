"use client";

import type { DefinedMarket } from "@/config/markets";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

const SAIL_EARN_TAGLINE_CLASS =
  "min-w-0 text-center text-xl font-bold leading-snug text-[#1E4775] sm:text-2xl lg:text-3xl";
const SAIL_EARN_TAGLINE_LONG_CLASS = "font-extrabold text-[#2d6b5c]";
const SAIL_EARN_TAGLINE_SHORT_CLASS = "font-extrabold text-[#c45c4e]";
const SAIL_EARN_PERKS_CLASS =
  "mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium tracking-wide text-[#1E4775]/65 sm:gap-x-0 sm:text-xs";
const SAIL_EARN_PERK_ITEM_CLASS =
  "inline-flex items-center gap-1.5 text-[#1E4775]/70";
const SAIL_EARN_PERK_RULE_CLASS =
  "mx-2.5 hidden h-3 w-px shrink-0 bg-[#1E4775]/20 sm:mx-3 sm:inline-block";

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
        {SAIL_EARN_PERKS.map((label, index) => (
          <li key={label} className="inline-flex items-center">
            {index > 0 ? (
              <span className={SAIL_EARN_PERK_RULE_CLASS} aria-hidden="true" />
            ) : null}
            <span className={SAIL_EARN_PERK_ITEM_CLASS}>
              <span
                className="inline-block h-1 w-1 rounded-full bg-[#4A9784]"
                aria-hidden="true"
              />
              <span>{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
