"use client";

import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import { formatSailMarketDirectionTitle } from "@/utils/sailMarketDirectionLabels";

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
  size?: SailMarketPriceChartSize;
};

/**
 * Sail leveraged-token price chart — explicit height so Recharts gets a non-zero box.
 */
export function SailMarketPriceChart({
  marketId,
  market,
  className = "",
  hideTitle = false,
  size = "default",
}: SailMarketPriceChartProps) {
  const symbol = market.leveragedToken?.symbol || "Token";
  const chartTitle = formatSailMarketDirectionTitle(market);
  const chartHeightClass = SAIL_CHART_HEIGHT_CLASS[size];

  return (
    <div
      className={`flex flex-col rounded-md border border-[#1E4775]/12 bg-white p-3 shadow-sm ${className}`}
    >
      {!hideTitle ? (
        <h3 className="mb-3 text-sm font-semibold text-[#1E4775]">
          {chartTitle} price
        </h3>
      ) : null}
      <div className={`${chartHeightClass} w-full shrink-0`}>
        <PriceChart
          tokenType="STEAMED"
          selectedToken={symbol}
          marketId={marketId}
        />
      </div>
    </div>
  );
}
