"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import type { SailContractReads } from "@/types/sail";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { buildSailUserPositionLabel } from "@/utils/sailUserPositionLabel";
import type { SailMarketsToolbarProps } from "@/components/sail/SailMarketsToolbar";
import { SailMarketActionPanel } from "./SailMarketActionPanel";
import { SailMarketChartColumn } from "./SailMarketChartColumn";
import { SailMarketHeader } from "./SailMarketHeader";
import { SailMarketInfoFooter } from "./SailMarketInfoFooter";
import { SailMarketMetricsColumn } from "./SailMarketMetricsColumn";
import { SailMarketPositionBar } from "./SailMarketPositionBar";
import { SailOtherMarketsStrip } from "./SailOtherMarketsStrip";
import type { SailWalletStatsStripProps } from "./SailWalletStatsStrip";
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
  isConnected: boolean;
  userDepositMap: Map<number, bigint | undefined>;
  tokenPricesByMarket: Record<
    string,
    { leveragedPriceUSD?: number } | undefined
  >;
  userDeposit?: bigint;
  currentValueUSD?: number;
  onManageSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
  walletStats: SailWalletStatsStripProps;
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
  isConnected,
  userDepositMap,
  tokenPricesByMarket,
  userDeposit,
  currentValueUSD,
  onManageSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
  walletStats,
}: SailAdvancedLayoutProps) {
  const dropdownOptions = useMemo(
    () =>
      dropdownMarkets.map(([marketId, market]) => {
        const globalIndex = sailMarketIdToIndex.get(marketId);
        const userDepositForMarket =
          isConnected && globalIndex !== undefined
            ? userDepositMap.get(globalIndex)
            : undefined;
        const position = isConnected
          ? buildSailUserPositionLabel(
              market,
              userDepositForMarket,
              tokenPricesByMarket[marketId]?.leveragedPriceUSD,
            )
          : { hasPosition: false as const };

        return {
          marketId,
          market,
          tvlUSD: tvlByMarketId.get(marketId),
          hasPosition: position.hasPosition,
          positionLabel: position.label,
        };
      }),
    [
      dropdownMarkets,
      tvlByMarketId,
      isConnected,
      sailMarketIdToIndex,
      userDepositMap,
      tokenPricesByMarket,
    ],
  );

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
        metrics={selectedMetrics}
        dropdownOptions={dropdownOptions}
        onSelectMarket={onSelectMarket}
        walletStats={walletStats}
      />

      <div className={`relative z-0 ${SAIL_ADVANCED_GRID_CLASS}`}>
        <div className="order-3 lg:order-none">
          <SailMarketMetricsColumn
            market={selectedMarket}
            metrics={selectedMetrics}
          />
        </div>
        <div className="order-1 flex flex-col gap-3 lg:order-none">
          <SailMarketPositionBar
            market={selectedMarket}
            userDeposit={userDeposit}
            currentValueUSD={currentValueUSD}
            leveragedTokenPriceUSD={leveragedTokenPriceUSD}
            isConnected={isConnected}
          />
          <SailMarketChartColumn
            marketId={selectedMarketId}
            market={selectedMarket}
          />
        </div>
        <div className="order-2 lg:order-none">
          <SailMarketActionPanel
            marketId={selectedMarketId}
            market={selectedMarket}
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
