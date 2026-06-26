"use client";

import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 min-h-72 items-center justify-center text-sm text-[#1E4775]/60">
      Loading chart…
    </div>
  ),
});

export type SailMarketPriceChartProps = {
  marketId: string;
  market: DefinedMarket;
  className?: string;
  /** Hide title row (e.g. when parent supplies its own heading). */
  hideTitle?: boolean;
};

/**
 * Sail leveraged-token price chart — same shell + sizing as the legacy expanded table row.
 * Uses explicit `h-72` so Recharts `ResponsiveContainer` gets a non-zero height.
 */
export function SailMarketPriceChart({
  marketId,
  market,
  className = "",
  hideTitle = false,
}: SailMarketPriceChartProps) {
  const symbol = market.leveragedToken?.symbol || "Token";

  return (
    <div
      className={`flex flex-col rounded-md border border-[#1E4775]/12 bg-white p-3 shadow-sm ${className}`}
    >
      {!hideTitle ? (
        <h3 className="mb-3 text-sm font-semibold text-[#1E4775]">
          {symbol} (short {getShortSide(market)} against {getLongSide(market)})
        </h3>
      ) : null}
      <div className="h-72 min-h-72 w-full shrink-0">
        <PriceChart
          tokenType="STEAMED"
          selectedToken={symbol}
          marketId={marketId}
        />
      </div>
    </div>
  );
}
