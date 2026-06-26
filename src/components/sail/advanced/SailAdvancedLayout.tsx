"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SailMarketNoPositionHint } from "./SailMarketNoPositionHint";
import { SailMarketPositionBar } from "./SailMarketPositionBar";
import { SailMobileTradeBar } from "./SailMobileTradeBar";
import { SailOtherMarketsStrip } from "./SailOtherMarketsStrip";
import type { SailWalletStatsStripProps } from "./SailWalletStatsStrip";
import { SAIL_ADVANCED_GRID_CLASS, SAIL_ADVANCED_SECTION_LABEL } from "./sailAdvancedStyles";

const SAIL_TRADE_PANEL_ID = "sail-trade-panel";

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
  const [tradeTab, setTradeTab] = useState<"mint" | "redeem">("mint");

  useEffect(() => {
    setTradeTab("mint");
  }, [selectedMarketId]);

  const scrollToTradePanel = useCallback(() => {
    document
      .getElementById(SAIL_TRADE_PANEL_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openTradeTab = useCallback(
    (tab: "mint" | "redeem") => {
      setTradeTab(tab);
      requestAnimationFrame(() => scrollToTradePanel());
    },
    [scrollToTradePanel],
  );

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

  const hasMarketPosition = userDeposit !== undefined && userDeposit > 0n;

  return (
    <div className="space-y-4 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <SailMarketHeader
        selectedMarketId={selectedMarketId}
        selectedMarket={selectedMarket}
        metrics={selectedMetrics}
        dropdownOptions={dropdownOptions}
        onSelectMarket={onSelectMarket}
        walletStats={walletStats}
      />

      <div className={`relative z-0 ${SAIL_ADVANCED_GRID_CLASS}`}>
        <div className="order-4 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <SailMarketMetricsColumn
            market={selectedMarket}
            metrics={selectedMetrics}
          />
        </div>

        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1">
          {hasMarketPosition ? (
            <div>
              <p className={SAIL_ADVANCED_SECTION_LABEL}>This market</p>
              <SailMarketPositionBar
                market={selectedMarket}
                userDeposit={userDeposit}
                currentValueUSD={currentValueUSD}
                leveragedTokenPriceUSD={leveragedTokenPriceUSD}
                isConnected={isConnected}
              />
            </div>
          ) : (
            <SailMarketNoPositionHint isConnected={isConnected} />
          )}
        </div>

        <div
          id={SAIL_TRADE_PANEL_ID}
          className="order-2 scroll-mt-20 lg:order-none lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4"
        >
          <SailMarketActionPanel
            marketId={selectedMarketId}
            market={selectedMarket}
            initialTab={tradeTab}
            onSuccess={onManageSuccess}
            leveragedTokenPriceUSD={leveragedTokenPriceUSD}
            ethPrice={ethPrice}
            wstETHPrice={wstETHPrice}
            fxSAVEPrice={fxSAVEPrice}
          />
        </div>

        <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2">
          <SailMarketChartColumn
            marketId={selectedMarketId}
            market={selectedMarket}
            tokenPriceUSD={selectedMetrics?.tokenPriceUSD}
          />
        </div>
      </div>

      <SailMobileTradeBar
        onMint={() => openTradeTab("mint")}
        onRedeem={() => openTradeTab("redeem")}
      />

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
