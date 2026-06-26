"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import type { SailContractReads } from "@/types/sail";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { buildSailMarketCardModel } from "@/utils/sailMarketCardModel";
import { isValidContractAddress } from "@/utils/isValidContractAddress";
import type { SailMarketsToolbarProps } from "@/components/sail/SailMarketsToolbar";
import { SailMarketActionPanel } from "./SailMarketActionPanel";
import { SailMarketChartColumn } from "./SailMarketChartColumn";
import { SailMarketHeader } from "./SailMarketHeader";
import { SailMarketInfoFooter } from "./SailMarketInfoFooter";
import { SailMarketMetricsColumn } from "./SailMarketMetricsColumn";
import { SailOtherMarketsStrip } from "./SailOtherMarketsStrip";
import { SAIL_ADVANCED_GRID_CLASS } from "./sailAdvancedStyles";

export type SailAdvancedLayoutProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  selectedMetrics: SailMarketDetailMetrics | undefined;
  dropdownMarkets: readonly [string, DefinedMarket][];
  stripMarkets: readonly [string, DefinedMarket][];
  tvlByMarketId: ReadonlyMap<string, number | undefined>;
  onSelectMarket: (marketId: string) => void;
  reads: SailContractReads | undefined;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
  minterConfigByMarketId: Map<string, unknown>;
  toolbarProps: SailMarketsToolbarProps;
  userDeposit?: bigint;
  currentValueUSD?: number;
  sailMarksForMarket?: number;
  onManageSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
};

export function SailAdvancedLayout({
  selectedMarketId,
  selectedMarket,
  selectedMetrics,
  dropdownMarkets,
  stripMarkets,
  tvlByMarketId,
  onSelectMarket,
  reads,
  sailMarketIdToIndex,
  marketOffsets,
  minterConfigByMarketId,
  toolbarProps,
  userDeposit,
  currentValueUSD,
  sailMarksForMarket,
  onManageSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
}: SailAdvancedLayoutProps) {
  const dropdownOptions = useMemo(
    () =>
      dropdownMarkets.map(([marketId, market]) => ({
        marketId,
        market,
        tvlUSD: tvlByMarketId.get(marketId),
      })),
    [dropdownMarkets, tvlByMarketId]
  );

  const selectedCardModel = useMemo(() => {
    if (!selectedMarketId || !selectedMarket || !reads) return null;
    const globalIndex = sailMarketIdToIndex.get(selectedMarketId);
    if (globalIndex === undefined) return null;
    const baseOffset = marketOffsets.get(globalIndex) ?? 0;
    const priceOracle = selectedMarket.addresses?.collateralPrice as
      | `0x${string}`
      | undefined;
    const leveragedTokenAddress = selectedMarket.addresses?.leveragedToken as
      | `0x${string}`
      | undefined;
    return buildSailMarketCardModel(
      selectedMarket,
      reads,
      baseOffset,
      isValidContractAddress(priceOracle),
      isValidContractAddress(leveragedTokenAddress),
      minterConfigByMarketId.get(selectedMarketId)
    );
  }, [
    selectedMarketId,
    selectedMarket,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
    minterConfigByMarketId,
  ]);

  if (!selectedMarketId || !selectedMarket) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 py-8 text-center text-sm text-white/70">
        No Sail markets match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SailMarketHeader
        selectedMarketId={selectedMarketId}
        selectedMarket={selectedMarket}
        longSide={selectedCardModel?.longSide}
        shortSide={selectedCardModel?.shortSide}
        dropdownOptions={dropdownOptions}
        onSelectMarket={onSelectMarket}
      />

      <div className={`relative z-0 ${SAIL_ADVANCED_GRID_CLASS}`}>
        <div className="order-3 lg:order-none">
          <SailMarketMetricsColumn
            market={selectedMarket}
            metrics={selectedMetrics}
          />
        </div>
        <div className="order-1 lg:order-none">
          <SailMarketChartColumn
            marketId={selectedMarketId}
            market={selectedMarket}
          />
        </div>
        <div className="order-2 lg:order-none">
          <SailMarketActionPanel
            marketId={selectedMarketId}
            market={selectedMarket}
            metrics={selectedMetrics}
            userDeposit={userDeposit}
            currentValueUSD={currentValueUSD}
            sailMarksForMarket={sailMarksForMarket}
            onSuccess={onManageSuccess}
            leveragedTokenPriceUSD={leveragedTokenPriceUSD}
            ethPrice={ethPrice}
            wstETHPrice={wstETHPrice}
            fxSAVEPrice={fxSAVEPrice}
          />
        </div>
      </div>

      <SailOtherMarketsStrip
        markets={stripMarkets}
        selectedMarketId={selectedMarketId}
        onSelectMarket={onSelectMarket}
        reads={reads}
        sailMarketIdToIndex={sailMarketIdToIndex}
        marketOffsets={marketOffsets}
        minterConfigByMarketId={minterConfigByMarketId}
        tvlByMarketId={tvlByMarketId}
        toolbarProps={toolbarProps}
      />

      <SailMarketInfoFooter />
    </div>
  );
}
