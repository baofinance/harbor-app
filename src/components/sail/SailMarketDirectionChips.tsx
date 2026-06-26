"use client";

import type { DefinedMarket } from "@/config/markets";
import {
  BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_LONG_DOT_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_DOT_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

type SailMarketDirectionChipsProps = {
  market: DefinedMarket;
  longSide: string;
  shortSide: string;
  className?: string;
};

/** Long / Short gradient chips — matches `SailBasicMarketCard`. */
export function SailMarketDirectionChips({
  market,
  longSide,
  shortSide,
  className = "",
}: SailMarketDirectionChipsProps) {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(
    market,
    longSide,
    shortSide
  );

  const longChipClass = `flex items-center justify-center gap-2 rounded-xl px-2.5 py-1 text-[11px] font-black leading-none tracking-[0.03em] whitespace-nowrap ${BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS}`;
  const shortChipClass = `flex items-center justify-center gap-2 rounded-xl px-2.5 py-1 text-[11px] font-black leading-none tracking-[0.03em] whitespace-nowrap ${BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={longChipClass}>
        <span
          className={`${BASIC_MARKET_DIRECTION_LONG_DOT_CLASS} shrink-0 animate-pulse`}
          aria-hidden
        />
        <span className="leading-none">{`Long ${longLabel}`}</span>
      </span>
      <span className={shortChipClass}>
        <span className="leading-none">{`Short ${shortLabel}`}</span>
        <span
          className={`${BASIC_MARKET_DIRECTION_SHORT_DOT_CLASS} shrink-0 animate-pulse`}
          aria-hidden
        />
      </span>
    </div>
  );
}
