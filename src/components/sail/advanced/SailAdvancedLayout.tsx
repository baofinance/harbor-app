"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import { isSailSoonUi } from "@/config/markets";
import type { SailContractReads } from "@/types/sail";
import {
  isSailDepositsPausedByLeverage,
  type SailMarketDetailMetrics,
} from "@/utils/sailMarketMetrics";
import { buildSailUserPositionLabel } from "@/utils/sailUserPositionLabel";
import { SailMarketActionPanel } from "./SailMarketActionPanel";
import { SailMarketChartColumn } from "./SailMarketChartColumn";
import { SailMarketHeader } from "./SailMarketHeader";
import { SailMarketInfoFooter } from "./SailMarketInfoFooter";
import { SailMarketMetricsCollapsible } from "./SailMarketMetricsCollapsible";
import { SailMobileTradeBar } from "./SailMobileTradeBar";
import type { SailWalletStatsStripProps } from "./SailWalletStatsStrip";
import type { SailDropdownPositionTone } from "@/utils/sailMarketDropdownPosition";
import {
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
  SAIL_ADVANCED_MAIN_GRID_CLASS,
} from "./sailAdvancedStyles";
import { ProductAdvancedLayoutShell } from "@/components/deposit/ProductAdvancedLayoutShell";

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
  marketDropdownPnLToneByMarketId?: Record<string, SailDropdownPositionTone>;
  marketDropdownPositionByMarketId?: Record<
    string,
    { label?: string; tone: SailDropdownPositionTone }
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
  marketDropdownPnLToneByMarketId = {},
  marketDropdownPositionByMarketId = {},
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

  const isComingSoon = selectedMarket ? isSailSoonUi(selectedMarket) : false;
  const isDepositsPaused = isSailDepositsPausedByLeverage(
    selectedMetrics?.leverageRatio,
  );

  useEffect(() => {
    setTradeTab(isDepositsPaused ? "redeem" : "mint");
  }, [selectedMarketId, isDepositsPaused]);

  const scrollToTradePanel = useCallback(() => {
    document
      .getElementById(SAIL_TRADE_PANEL_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openTradeTab = useCallback(
    (tab: "mint" | "redeem") => {
      if (tab === "mint" && isDepositsPaused) return;
      setTradeTab(tab);
      requestAnimationFrame(() => scrollToTradePanel());
    },
    [isDepositsPaused, scrollToTradePanel],
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
        const positionDisplay = isConnected
          ? marketDropdownPositionByMarketId[marketId]
          : undefined;
        const position = isConnected
          ? buildSailUserPositionLabel(
              market,
              userDepositForMarket,
              tokenPricesByMarket[marketId]?.leveragedPriceUSD,
            )
          : { hasPosition: false as const };
        const comingSoon = isSailSoonUi(market);

        return {
          marketId,
          market,
          leverageRatio,
          hasPosition: position.hasPosition,
          positionLabel: positionDisplay?.label ?? (
            position.hasPosition ? position.label?.replace(/^Your position ·\s*/, "") : undefined
          ),
          positionTone: position.hasPosition
            ? positionDisplay?.tone ??
              marketDropdownPnLToneByMarketId[marketId] ??
              "pending"
            : undefined,
          isComingSoon: comingSoon,
          isDepositsPaused:
            !comingSoon && isSailDepositsPausedByLeverage(leverageRatio),
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
      marketDropdownPnLToneByMarketId,
      marketDropdownPositionByMarketId,
    ],
  );

  if (!selectedMarketId || !selectedMarket) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 py-8 text-center text-sm text-white/70">
        No Sail markets match the current filters.
      </div>
    );
  }

  const haTokenSymbol =
    selectedMarket.peggedToken?.symbol || "ha token";

  return (
    <ProductAdvancedLayoutShell
      header={
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
          leverageRatio={selectedMetrics?.leverageRatio}
          rebalanceThresholdLabel={selectedMetrics?.rebalanceThresholdLabel}
        />
      }
      banner={
        isDepositsPaused && !isComingSoon ? (
          <div
            className={`overflow-hidden rounded-xl px-4 py-3 ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`}
            role="status"
          >
            <p className="text-sm font-semibold text-[#1E4775]">
              Deposits paused
            </p>
            <p className="mt-1 text-sm leading-snug text-[#1E4775]/75">
              More {haTokenSymbol} needs to be minted for the leverage function to
              work as expected on this market. Selling existing sail tokens remains
              available.
            </p>
          </div>
        ) : null
      }
      tradePanelId={SAIL_TRADE_PANEL_ID}
      gridClassName={SAIL_ADVANCED_MAIN_GRID_CLASS}
      primary={
        <div className="flex min-h-[22rem] flex-1 flex-col sm:min-h-[26rem] lg:min-h-0">
          <SailMarketChartColumn
            marketId={selectedMarketId}
            market={selectedMarket}
          />
        </div>
      }
      action={
        <SailMarketActionPanel
          marketId={selectedMarketId}
          market={selectedMarket}
          initialTab={tradeTab}
          onSuccess={onManageSuccess}
          leveragedTokenPriceUSD={leveragedTokenPriceUSD}
          ethPrice={ethPrice}
          wstETHPrice={wstETHPrice}
          fxSAVEPrice={fxSAVEPrice}
          isComingSoon={isComingSoon}
          depositsPaused={isDepositsPaused}
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
      }
      metrics={
        <SailMarketMetricsCollapsible
          market={selectedMarket}
          metrics={selectedMetrics}
        />
      }
      mobileBar={
        isComingSoon ? null : (
          <SailMobileTradeBar
            onMint={() => openTradeTab("mint")}
            onRedeem={() => openTradeTab("redeem")}
            mintDisabled={isDepositsPaused}
          />
        )
      }
      infoFooter={<SailMarketInfoFooter />}
    />
  );
}
