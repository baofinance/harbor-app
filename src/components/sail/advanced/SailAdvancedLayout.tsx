"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import type { SailContractReads } from "@/types/sail";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { buildSailUserPositionLabel } from "@/utils/sailUserPositionLabel";
import { SailMarketActionPanel } from "./SailMarketActionPanel";
import { SailMarketChartColumn } from "./SailMarketChartColumn";
import { SailMarketHeader } from "./SailMarketHeader";
import { SailMarketInfoFooter } from "./SailMarketInfoFooter";
import { SailMarketMetricsCollapsible } from "./SailMarketMetricsCollapsible";
import { SailMobileTradeBar } from "./SailMobileTradeBar";
import type { SailWalletStatsStripProps } from "./SailWalletStatsStrip";
import { SAIL_ADVANCED_MAIN_GRID_CLASS } from "./sailAdvancedStyles";

const SAIL_TRADE_PANEL_ID = "sail-trade-panel";

export type SailAdvancedLayoutProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  selectedMetrics: SailMarketDetailMetrics | undefined;
  dropdownMarkets: readonly [string, DefinedMarket][];
  onSelectMarket: (marketId: string) => void;
  reads: SailContractReads | undefined;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
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
  onSelectMarket,
  reads,
  sailMarketIdToIndex,
  marketOffsets,
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
        const baseOffset =
          globalIndex !== undefined ? marketOffsets.get(globalIndex) : undefined;
        const leverageRatio =
          baseOffset !== undefined
            ? (reads?.[baseOffset]?.result as bigint | undefined)
            : undefined;
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
          leverageRatio,
          hasPosition: position.hasPosition,
          positionLabel: position.hasPosition ? position.label : undefined,
        };
      }),
    [
      dropdownMarkets,
      reads,
      marketOffsets,
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
    <div className="space-y-4 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <SailMarketHeader
        selectedMarketId={selectedMarketId}
        selectedMarket={selectedMarket}
        dropdownOptions={dropdownOptions}
        onSelectMarket={onSelectMarket}
        walletStats={walletStats}
        marketPosition={{
          userDeposit,
          currentValueUSD,
          leveragedTokenPriceUSD,
          isConnected,
        }}
      />

      <div className="space-y-4">
        <div className={`relative z-0 ${SAIL_ADVANCED_MAIN_GRID_CLASS}`}>
          <div className="order-1 flex min-h-0 flex-col gap-3 lg:order-none lg:h-full">
            <div className="flex min-h-[22rem] flex-1 flex-col sm:min-h-[26rem] lg:min-h-0">
              <SailMarketChartColumn
                marketId={selectedMarketId}
                market={selectedMarket}
                tokenPriceUSD={selectedMetrics?.tokenPriceUSD}
              />
            </div>
          </div>

          <div
            id={SAIL_TRADE_PANEL_ID}
            className="order-2 flex min-h-0 flex-col scroll-mt-20 lg:order-none lg:h-full"
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
              marketFees={
                selectedMetrics
                  ? {
                      buyFeeRatio: selectedMetrics.mintFeeRatio,
                      sellFeeRatio: selectedMetrics.redeemFeeRatio,
                      activeBuyBand: selectedMetrics.activeMintBand,
                      activeSellBand: selectedMetrics.activeRedeemBand,
                    }
                  : undefined
              }
            />
          </div>
        </div>

        <SailMarketMetricsCollapsible
          market={selectedMarket}
          metrics={selectedMetrics}
        />
      </div>

      <SailMobileTradeBar
        onMint={() => openTradeTab("mint")}
        onRedeem={() => openTradeTab("redeem")}
      />

      <SailMarketInfoFooter />
    </div>
  );
}
