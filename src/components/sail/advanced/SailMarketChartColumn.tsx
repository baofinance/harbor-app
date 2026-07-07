"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailMarketPriceChart } from "@/components/sail/SailMarketPriceChart";

type SailMarketChartColumnProps = {
  marketId: string;
  market: DefinedMarket;
};

export function SailMarketChartColumn({
  marketId,
  market,
}: SailMarketChartColumnProps) {
  return (
    <SailMarketPriceChart
      marketId={marketId}
      market={market}
      size="large"
      showPriceHeader
      fillHeight
      className="lg:h-full lg:min-h-0 lg:flex-1"
    />
  );
}
