"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import { buildSailMarketCardModel } from "@/utils/sailMarketCardModel";
import type { SailContractReads } from "@/types/sail";
import { SailBasicMarketCard } from "./SailBasicMarketCard";

export type SailBasicMarketCardsGridProps = {
  activeMarkets: Array<[string, DefinedMarket]>;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
  reads: SailContractReads;
  minterConfigByMarketId: Map<string, unknown>;
  isConnected: boolean;
  onExploreMarket: (marketId: string, m: DefinedMarket) => void;
};

function isValidContractAddress(addr: unknown): boolean {
  return (
    typeof addr === "string" && addr.startsWith("0x") && addr.length === 42
  );
}

export function SailBasicMarketCardsGrid({
  activeMarkets,
  sailMarketIdToIndex,
  marketOffsets,
  reads,
  minterConfigByMarketId,
  isConnected,
  onExploreMarket,
}: SailBasicMarketCardsGridProps) {
  const rows = useMemo(() => {
    return activeMarkets.flatMap(([id, m]) => {
      const globalIndex = sailMarketIdToIndex.get(id);
      if (globalIndex === undefined) return [];
      const baseOffset = marketOffsets.get(globalIndex) ?? 0;

      const priceOracle = m.addresses?.collateralPrice;
      const leveragedTokenAddress = m.addresses?.leveragedToken;
      const hasOracle = isValidContractAddress(priceOracle);
      const hasToken = isValidContractAddress(leveragedTokenAddress);

      const model = buildSailMarketCardModel(
        m,
        reads,
        baseOffset,
        hasOracle,
        hasToken,
        minterConfigByMarketId.get(id)
      );

      return [{ id, market: m, model }];
    });
  }, [
    activeMarkets,
    sailMarketIdToIndex,
    marketOffsets,
    reads,
    minterConfigByMarketId,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map(({ id, market, model }) => (
        <SailBasicMarketCard
          key={id}
          marketId={id}
          market={market}
          model={model}
          isConnected={isConnected}
          onExploreMarket={onExploreMarket}
        />
      ))}
    </div>
  );
}
