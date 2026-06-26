"use client";

import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import {
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_META,
  SAIL_ADVANCED_PANEL,
} from "./sailAdvancedStyles";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-72 items-center justify-center text-sm text-white/60">
      Loading chart…
    </div>
  ),
});

type SailMarketChartColumnProps = {
  marketId: string;
  market: DefinedMarket;
};

export function SailMarketChartColumn({
  marketId,
  market,
}: SailMarketChartColumnProps) {
  const symbol = market.leveragedToken?.symbol || "Token";

  return (
    <div className={`${SAIL_ADVANCED_PANEL} flex min-h-[20rem] flex-col p-3 sm:p-4`}>
      <div className="mb-2">
        <h2 className={SAIL_ADVANCED_LABEL}>{symbol} price</h2>
        <p className={SAIL_ADVANCED_META}>
          Short {getShortSide(market)} against {getLongSide(market)}
        </p>
      </div>
      <div className="min-h-72 flex-1 rounded-lg border border-white/[0.06] bg-[#0a1929]/40 p-2">
        <PriceChart
          tokenType="STEAMED"
          selectedToken={symbol}
          marketId={marketId}
        />
      </div>
    </div>
  );
}
