"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import { isSailSoonUi } from "@/config/markets";
import { buildSailMarketCardModel } from "@/utils/sailMarketCardModel";
import { formatLeverage, formatUSD } from "@/utils/sailDisplayFormat";
import type { SailContractReads } from "@/types/sail";
import { isValidContractAddress } from "@/utils/isValidContractAddress";
import { SailMintRedeemFeeColumn } from "@/components/sail/SailMintRedeemFeeColumn";
import {
  SailMarketsToolbar,
  type SailMarketsToolbarProps,
} from "@/components/sail/SailMarketsToolbar";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_PANEL,
  SAIL_ADVANCED_SHELL,
} from "./sailAdvancedStyles";

type SailOtherMarketsStripProps = {
  markets: readonly [string, DefinedMarket][];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
  reads: SailContractReads | undefined;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
  minterConfigByMarketId: Map<string, unknown>;
  tvlByMarketId: ReadonlyMap<string, number | undefined>;
  toolbarProps: SailMarketsToolbarProps;
};

export function SailOtherMarketsStrip({
  markets,
  selectedMarketId,
  onSelectMarket,
  reads,
  sailMarketIdToIndex,
  marketOffsets,
  minterConfigByMarketId,
  tvlByMarketId,
  toolbarProps,
}: SailOtherMarketsStripProps) {
  const cards = useMemo(() => {
    if (!reads) return [];

    return markets.map(([marketId, market]) => {
      const globalIndex = sailMarketIdToIndex.get(marketId);
      if (globalIndex === undefined) return null;
      const baseOffset = marketOffsets.get(globalIndex) ?? 0;
      const priceOracle = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const leveragedTokenAddress = market.addresses?.leveragedToken as
        | `0x${string}`
        | undefined;
      const hasOracle = isValidContractAddress(priceOracle);
      const hasToken = isValidContractAddress(leveragedTokenAddress);
      const model = buildSailMarketCardModel(
        market,
        reads,
        baseOffset,
        hasOracle,
        hasToken,
        minterConfigByMarketId.get(marketId)
      );

      return {
        marketId,
        market,
        model,
        tvlUSD: tvlByMarketId.get(marketId),
        isComingSoon: isSailSoonUi(market),
      };
    }).filter(Boolean) as Array<{
      marketId: string;
      market: DefinedMarket;
      model: ReturnType<typeof buildSailMarketCardModel>;
      tvlUSD: number | undefined;
      isComingSoon: boolean;
    }>;
  }, [
    markets,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
    minterConfigByMarketId,
    tvlByMarketId,
  ]);

  return (
    <section id="sail-other-markets" className={`${SAIL_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={SAIL_ADVANCED_LABEL}>Other markets</h2>
      </div>

      <SailMarketsToolbar {...toolbarProps} />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
        {cards.map(({ marketId, market, model, tvlUSD }) => {
          const active = marketId === selectedMarketId;
          const symbol = market.leveragedToken?.symbol || marketId;
          return (
            <button
              key={marketId}
              type="button"
              onClick={() => onSelectMarket(marketId)}
              className={`min-w-[220px] max-w-[260px] shrink-0 snap-start rounded-xl border p-3 text-left transition ${
                active
                  ? "border-white/30 bg-white/[0.14] ring-1 ring-white/20"
                  : "border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.1]"
              }`}
            >
              <div className="font-mono text-sm font-bold text-white">{symbol}</div>
              <div className={`mt-0.5 ${SAIL_ADVANCED_CAPTION}`}>
                {model.longSide} / {model.shortSide}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <span className={SAIL_ADVANCED_CAPTION}>Leverage</span>
                <span className="text-right font-mono text-white">
                  {formatLeverage(model.leverageRatio)}
                </span>
                <span className={SAIL_ADVANCED_CAPTION}>TVL</span>
                <span className="text-right font-mono text-white">
                  {tvlUSD !== undefined ? formatUSD(tvlUSD) : "—"}
                </span>
              </div>
              <div className="mt-2">
                <SailMintRedeemFeeColumn
                  collateralRatio={model.collateralRatio}
                  mintFeeRatio={model.mintFeeRatio}
                  redeemFeeRatio={model.redeemFeeRatio}
                  activeMintBand={model.activeMintBand}
                  activeRedeemBand={model.activeRedeemBand}
                  mintBands={model.mintBands}
                  redeemBands={model.redeemBands}
                  compactRow
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
