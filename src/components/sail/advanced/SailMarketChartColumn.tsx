"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailMarketPriceChart } from "@/components/sail/SailMarketPriceChart";

type SailMarketChartColumnProps = {
  marketId: string;
  market: DefinedMarket;
  tokenPriceUSD?: number;
};

export function SailMarketChartColumn({
  marketId,
  market,
  tokenPriceUSD,
}: SailMarketChartColumnProps) {
  return (
    <SailMarketPriceChart
      marketId={marketId}
      market={market}
      size="large"
      showPriceHeader
      tokenPriceUSD={tokenPriceUSD}
      fillHeight
      className="lg:h-full lg:min-h-0 lg:flex-1"
    />
  );
}
