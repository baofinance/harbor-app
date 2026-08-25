"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import { isAnchorSoonUi } from "@/config/markets";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import { AnchorMarketActionPanel } from "./AnchorMarketActionPanel";
import { AnchorMarketChartColumn } from "./AnchorMarketChartColumn";
import { AnchorMarketHeader } from "./AnchorMarketHeader";
import { AnchorMarketInfoFooter } from "./AnchorMarketInfoFooter";
import { AnchorMarketMetricsCollapsible } from "./AnchorMarketMetricsCollapsible";
import { AnchorMobileTradeBar } from "./AnchorMobileTradeBar";
import type { AnchorWalletStatsStripProps } from "./AnchorWalletStatsStrip";

/** Slightly wider trade column so claim bar + embedded form use the panel width. */
const ANCHOR_EARN_MAIN_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:items-start lg:min-h-[36rem]";

const ANCHOR_TRADE_PANEL_ID = "anchor-trade-panel";

export type AnchorAdvancedLayoutProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  selectedMarketData: MarketData | undefined;
  dropdownMarkets: readonly [string, DefinedMarket][];
  onSelectMarket: (marketId: string) => void;
  isConnected: boolean;
  marketPositions: Record<
    string,
    { collateralPool: bigint; sailPool: bigint } | undefined
  >;
  marketsDataById: Map<string, MarketData>;
  peggedPriceUSDMap?: Record<string, bigint | undefined>;
  walletStats: AnchorWalletStatsStripProps;
  onManageSuccess?: () => void;
  allMarketsForSelectedToken?: Array<{
    marketId: string;
    market: DefinedMarket;
  }>;
  claimableRewardsUSD?: number;
  isClaiming?: boolean;
  onClaim?: () => void;
};

export function AnchorAdvancedLayout({
  selectedMarketId,
  selectedMarket,
  selectedMarketData,
  dropdownMarkets,
  onSelectMarket,
  isConnected,
  marketPositions,
  marketsDataById,
  peggedPriceUSDMap,
  walletStats,
  onManageSuccess,
  allMarketsForSelectedToken,
  claimableRewardsUSD = 0,
  isClaiming = false,
  onClaim,
}: AnchorAdvancedLayoutProps) {
  const [tradeTab, setTradeTab] = useState<"deposit" | "withdraw">("deposit");

  const isComingSoon = selectedMarket ? isAnchorSoonUi(selectedMarket) : false;

  useEffect(() => {
    setTradeTab("deposit");
  }, [selectedMarketId]);

  const scrollToTradePanel = useCallback(() => {
    document
      .getElementById(ANCHOR_TRADE_PANEL_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openTradeTab = useCallback(
    (tab: "deposit" | "withdraw") => {
      setTradeTab(tab);
      requestAnimationFrame(() => scrollToTradePanel());
    },
    [scrollToTradePanel],
  );

  const peggedPriceUSD = useMemo(() => {
    if (!selectedMarketId || !peggedPriceUSDMap) return undefined;
    const raw = peggedPriceUSDMap[selectedMarketId];
    if (!raw) return undefined;
    const n = Number(raw) / 1e18;
    return n > 0 ? n : undefined;
  }, [selectedMarketId, peggedPriceUSDMap]);

  const positionUSD =
    (selectedMarketData?.collateralPoolDepositUSD || 0) +
    (selectedMarketData?.sailPoolDepositUSD || 0);

  const bestApr = Math.max(
    selectedMarketData?.maxAPR || 0,
    selectedMarketData?.minAPR || 0,
  );

  const educationBestAprLabel =
    bestApr > 0 ? `${bestApr.toFixed(1)}%` : undefined;

  if (!selectedMarketId || !selectedMarket) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 py-8 text-center text-sm text-white/70">
        No Earn markets match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <AnchorMarketHeader
        selectedMarketId={selectedMarketId}
        selectedMarket={selectedMarket}
        dropdownMarkets={dropdownMarkets}
        marketsDataById={marketsDataById}
        marketPositions={marketPositions}
        onSelectMarket={onSelectMarket}
        walletStats={walletStats}
        marketPosition={{
          isConnected,
          positionUSD,
          collateralPoolUSD: selectedMarketData?.collateralPoolDepositUSD,
          sailPoolUSD: selectedMarketData?.sailPoolDepositUSD,
          bestApr: bestApr > 0 ? bestApr : undefined,
          haTokenPriceUSD: peggedPriceUSD,
        }}
        educationBestAprLabel={educationBestAprLabel}
      />

      <div className="space-y-4 pt-0.5">
        <div className={`relative z-0 ${ANCHOR_EARN_MAIN_GRID_CLASS}`}>
          <div className="order-1 flex min-h-0 flex-col gap-3 lg:order-none lg:h-full">
            <div className="flex min-h-[22rem] flex-1 flex-col sm:min-h-[26rem] lg:min-h-0">
              <AnchorMarketChartColumn market={selectedMarket} />
            </div>
          </div>

          <div
            id={ANCHOR_TRADE_PANEL_ID}
            className="order-2 flex min-h-0 w-full min-w-0 flex-col scroll-mt-20 lg:order-none lg:self-start"
          >
            <AnchorMarketActionPanel
              key={selectedMarketId}
              marketId={selectedMarketId}
              market={selectedMarket}
              initialTab={tradeTab}
              onSuccess={onManageSuccess}
              allMarkets={allMarketsForSelectedToken}
              positionsMap={marketPositions as Record<
                string,
                { collateralPool: bigint; sailPool: bigint }
              >}
              isComingSoon={isComingSoon}
              claimBar={
                onClaim
                  ? {
                      isConnected,
                      claimableRewardsUSD,
                      isClaiming,
                      onClaim,
                    }
                  : null
              }
            />
          </div>
        </div>

        <AnchorMarketMetricsCollapsible
          market={selectedMarket}
          marketData={selectedMarketData}
          peggedPriceUSD={peggedPriceUSD}
        />
      </div>

      {isComingSoon ? null : (
        <AnchorMobileTradeBar
          onDeposit={() => openTradeTab("deposit")}
          onWithdraw={() => openTradeTab("withdraw")}
        />
      )}

      <AnchorMarketInfoFooter />
    </div>
  );
}
