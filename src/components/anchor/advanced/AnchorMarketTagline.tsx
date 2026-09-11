"use client";

import type { DefinedMarket } from "@/config/markets";

const TAGLINE_CLASS =
  "min-w-0 text-center text-xl font-bold leading-snug text-white/90 sm:text-2xl lg:text-3xl";
const ACCENT_CLASS = "font-extrabold text-[#6bc4a8]";
const PERKS_CLASS =
  "mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium tracking-wide text-white/70 sm:gap-x-0 sm:text-xs";
const PERK_ITEM_CLASS = "inline-flex items-center gap-1.5 text-white/75";
const PERK_RULE_CLASS =
  "mx-2.5 hidden h-3 w-px shrink-0 bg-white/20 sm:mx-3 sm:inline-block";

const EARN_PERKS = [
  "Pegged exposure",
  "Stability pool yield",
  "Redeem anytime",
] as const;

type AnchorMarketTaglineProps = {
  market: DefinedMarket;
  className?: string;
  /** Single-line headline beside compact market selectors (hides perk row). */
  layout?: "default" | "inline";
};

/** Header tagline beside the market dropdown. */
export function AnchorMarketTagline({
  market,
  className = "",
  layout = "default",
}: AnchorMarketTaglineProps) {
  const pegTarget = market.pegTarget || market.peggedToken?.symbol || "asset";
  const haSymbol = market.peggedToken?.symbol || "haToken";
  const inline = layout === "inline";

  return (
    <div className={`w-full ${className}`.trim()}>
      {!inline ? (
        <ul className={PERKS_CLASS}>
          {EARN_PERKS.map((label, index) => (
            <li key={label} className="inline-flex items-center">
              {index > 0 ? (
                <span className={PERK_RULE_CLASS} aria-hidden="true" />
              ) : null}
              <span className={PERK_ITEM_CLASS}>
                <span
                  className="inline-block h-1 w-1 rounded-full bg-[#6bc4a8]"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p
        className={
          inline
            ? "min-w-0 text-left text-lg font-bold leading-tight text-white/90 sm:text-xl lg:text-center lg:text-2xl xl:text-3xl"
            : TAGLINE_CLASS
        }
      >
        Earn native yield with{" "}
        <span className={ACCENT_CLASS}>{haSymbol}</span>, pegged to{" "}
        <span className={ACCENT_CLASS}>{pegTarget}</span>.
      </p>
    </div>
  );
}
