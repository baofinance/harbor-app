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
    <SailMarketPriceChart marketId={marketId} market={market} className="h-full" />
  );
}
