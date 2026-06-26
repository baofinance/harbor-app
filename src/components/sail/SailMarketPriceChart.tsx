"use client";

import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import { formatUSD } from "@/utils/sailDisplayFormat";
import {
  formatSailMarketDirectionTitle,
  getSailMarketTokenSymbol,
} from "@/utils/sailMarketDirectionLabels";
import { SAIL_ADVANCED_FROSTED_LIGHT_PANEL } from "@/components/sail/advanced/sailAdvancedStyles";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-72 items-center justify-center text-sm text-[#1E4775]/60">
      Loading chart…
    </div>
  ),
});

export type SailMarketPriceChartSize = "default" | "large";

const SAIL_CHART_HEIGHT_CLASS: Record<SailMarketPriceChartSize, string> = {
  default: "h-72 min-h-72",
  /** UI+ center column — taller chart for the single-market dashboard. */
  large: "min-h-96 h-96 sm:min-h-[26rem] sm:h-[26rem] lg:min-h-[30rem] lg:h-[30rem]",
};

export type SailMarketPriceChartProps = {
  marketId: string;
  market: DefinedMarket;
  className?: string;
  /** Hide title row (e.g. when parent supplies its own heading). */
  hideTitle?: boolean;
  /** Price + symbol header for UI+ chart column. */
  showPriceHeader?: boolean;
  tokenPriceUSD?: number;
  size?: SailMarketPriceChartSize;
  /** Grow chart to fill column height (UI+ desktop grid). */
  fillHeight?: boolean;
};

/**
 * Sail leveraged-token price chart — explicit height so Recharts gets a non-zero box.
 */
export function SailMarketPriceChart({
  marketId,
  market,
  className = "",
  hideTitle = false,
  showPriceHeader = false,
  tokenPriceUSD,
  size = "default",
  fillHeight = false,
}: SailMarketPriceChartProps) {
  const symbol = getSailMarketTokenSymbol(market);
  const chartTitle = formatSailMarketDirectionTitle(market);
  const chartHeightClass = fillHeight
    ? "flex min-h-96 flex-col sm:min-h-[26rem] lg:min-h-0 lg:flex-1"
    : SAIL_CHART_HEIGHT_CLASS[size];
  const priceDisplay =
    tokenPriceUSD !== undefined && Number.isFinite(tokenPriceUSD)
      ? formatUSD(tokenPriceUSD)
      : "—";

  return (
    <div
      className={`flex flex-col rounded-xl p-3 ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} ${
        fillHeight ? "lg:h-full lg:min-h-0 lg:flex-1" : ""
      } ${className}`}
    >
      {showPriceHeader ? (
        <div className="mb-2 flex shrink-0 items-end justify-between gap-3 border-b border-[#1E4775]/10 pb-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-[#1E4775]/55">
              {symbol} price
            </p>
            <p className="font-mono text-xl font-bold tabular-nums text-[#1E4775] sm:text-2xl">
              {priceDisplay}
            </p>
          </div>
          <p className="hidden shrink-0 text-right text-[11px] text-[#1E4775]/50 sm:block">
            {chartTitle}
          </p>
        </div>
      ) : !hideTitle ? (
        <h3 className="mb-3 text-sm font-semibold text-[#1E4775]">
          {chartTitle} price
        </h3>
      ) : null}
      <div className={`${chartHeightClass} flex flex-col`}>
        <PriceChart
          tokenType="STEAMED"
          selectedToken={symbol}
          marketId={marketId}
        />
      </div>
    </div>
  );
}
