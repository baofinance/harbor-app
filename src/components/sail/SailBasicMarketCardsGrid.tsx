"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import { buildSailMarketCardModel } from "@/utils/sailMarketCardModel";
import type { SailContractReads } from "@/types/sail";
import { BASIC_MARKET_CARDS_GRID_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import { SailBasicMarketCard } from "./SailBasicMarketCard";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

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

      const sailActive = (m as { sailActive?: boolean | "soon" }).sailActive;
      if (sailActive === false) return [];

      const priceOracle = m.addresses?.collateralPrice;
      const leveragedTokenAddress = m.addresses?.leveragedToken;
      const hasOracle = isValidContractAddress(priceOracle);
      const hasToken = isValidContractAddress(leveragedTokenAddress);

      const forcedSoon =
        sailActive === "soon" ||
        (m.leveragedToken?.symbol || "").toLowerCase() === "hssteth-usd";
      if (forcedSoon) {
        return [
          {
            id,
            market: m,
            model: {
              leverageRatio: 10n ** 18n, // 1.00x
              collateralRatio: undefined,
              longSide: getLongSide(m),
              shortSide: getShortSide(m),
              mintFeeRatio: 10n ** 18n, // Blocked
              redeemFeeRatio: 10n ** 18n, // Blocked
              activeMintBand: undefined,
              activeRedeemBand: undefined,
              mintBands: undefined,
              redeemBands: undefined,
              direction: "LONG",
              collateralSymbol: m.collateral?.symbol || "",
            },
            isComingSoon: true as const,
          },
        ];
      }

      const model = buildSailMarketCardModel(
        m,
        reads,
        baseOffset,
        hasOracle,
        hasToken,
        minterConfigByMarketId.get(id)
      );

      return [{ id, market: m, model, isComingSoon: false as const }];
    });
  }, [
    activeMarkets,
    sailMarketIdToIndex,
    marketOffsets,
    reads,
    minterConfigByMarketId,
  ]);

  // Basic grid token shared with Anchor basic cards — see BASIC_MARKET_CARDS_GRID_CLASS.
  return (
    <div className={BASIC_MARKET_CARDS_GRID_CLASS}>
      {rows.map(({ id, market, model, isComingSoon }) => {
        return (
          <SailBasicMarketCard
            key={id}
            marketId={id}
            market={market}
            model={model}
            isConnected={isConnected}
            onExploreMarket={onExploreMarket}
            isComingSoon={isComingSoon}
          />
        );
      })}
    </div>
  );
}
