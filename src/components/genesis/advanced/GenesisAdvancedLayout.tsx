"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { GenesisActiveVoyageCardProps } from "@/components/genesis/GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "@/components/genesis/GenesisActiveVoyageCard";
import { GenesisRevenueShareCalculator } from "@/components/genesis/GenesisRevenueShareCalculator";
import { resolveRevenueShareCalculatorProps } from "@/utils/maidenVoyageYieldShareEstimate";
import { GenesisVoyageHeader } from "./GenesisVoyageHeader";
import { GenesisVoyageActionPanel } from "./GenesisVoyageActionPanel";
import { GenesisVoyageInfoFooter } from "./GenesisVoyageInfoFooter";
import type { GenesisVoyageOption } from "./GenesisChainVoyageSelectors";
import {
  GENESIS_TRADE_PANEL_GRID_CLASS,
  GENESIS_TRADE_PANEL_ID,
  GENESIS_VOYAGE_CARD_HEIGHT,
} from "./genesisAdvancedStyles";

export type GenesisAdvancedLayoutProps = {
  voyageOptions: readonly GenesisVoyageOption[];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
  activeCard: GenesisActiveVoyageCardProps | null;
  onManageSuccess?: () => void;
  /** Open overlay manage modal (mobile Deposit Now). */
  onOpenDepositModal: () => void;
  children?: React.ReactNode;
};

export function GenesisAdvancedLayout({
  voyageOptions,
  selectedMarketId,
  onSelectMarket,
  activeCard,
  onManageSuccess,
  onOpenDepositModal,
  children,
}: GenesisAdvancedLayoutProps) {
  const [panelTab, setPanelTab] = useState<"deposit" | "withdraw">("deposit");

  useEffect(() => {
    setPanelTab("deposit");
  }, [selectedMarketId]);

  const scrollToTradePanel = useCallback(() => {
    document
      .getElementById(GENESIS_TRADE_PANEL_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const focusDepositPanel = useCallback(() => {
    setPanelTab("deposit");
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      requestAnimationFrame(() => scrollToTradePanel());
    } else {
      onOpenDepositModal();
    }
  }, [onOpenDepositModal, scrollToTradePanel]);

  const handleCardDeposit = useCallback(() => {
    focusDepositPanel();
  }, [focusDepositPanel]);

  const handleCardClaim = useCallback(() => {
    requestAnimationFrame(() => scrollToTradePanel());
  }, [scrollToTradePanel]);

  const selectedMarket = useMemo((): GenesisMarketConfig | null => {
    const opt =
      voyageOptions.find((o) => o.marketId === selectedMarketId) ??
      voyageOptions[0];
    return opt?.market ?? activeCard?.market ?? null;
  }, [voyageOptions, selectedMarketId, activeCard?.market]);

  const showCalculator =
    activeCard != null &&
    !activeCard.capLoading &&
    !activeCard.capUnavailable &&
    activeCard.capDisplay != null;

  const calculatorProps = showCalculator
    ? resolveRevenueShareCalculatorProps({
        capDisplay: activeCard.capDisplay!,
        genesisAddress: activeCard.genesisAddress,
        yieldRevSharePct: activeCard.yieldRevSharePct,
        userDepositUsd: activeCard.userDepositUsd,
      })
    : null;

  const resolvedCard: GenesisActiveVoyageCardProps | null = activeCard
    ? {
        ...activeCard,
        onDeposit: handleCardDeposit,
        onClaim: handleCardClaim,
        // Docs fallback on the card — How it works lives in the info footer now.
        onHowItWorks: undefined,
      }
    : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <GenesisVoyageHeader
        options={voyageOptions}
        selectedMarketId={selectedMarketId}
        selectedMarket={selectedMarket}
        yieldRevSharePct={activeCard?.yieldRevSharePct ?? null}
        onSelectMarket={onSelectMarket}
        voyageStatus={activeCard?.voyageStatus ?? null}
        capDisplay={activeCard?.capDisplay ?? null}
        capLoading={activeCard?.capLoading}
        genesisAddress={activeCard?.genesisAddress}
        userDepositUsd={activeCard?.userDepositUsd}
      />

      <div
        id="maiden-voyage-active"
        className={`${GENESIS_TRADE_PANEL_GRID_CLASS} scroll-mt-24`}
      >
        <div className={`min-w-0 ${GENESIS_VOYAGE_CARD_HEIGHT}`}>
          {resolvedCard ? (
            <GenesisActiveVoyageCard
              {...resolvedCard}
              className={`h-full w-full ${GENESIS_VOYAGE_CARD_HEIGHT}`}
            />
          ) : (
            <div
              className={`flex min-h-[16rem] ${GENESIS_VOYAGE_CARD_HEIGHT} items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-sm text-white/60`}
            >
              No active Maiden Voyage to feature right now.
            </div>
          )}
        </div>

        {selectedMarket && selectedMarketId ? (
          <GenesisVoyageActionPanel
            marketId={selectedMarketId}
            market={selectedMarket}
            activeTab={panelTab}
            onTabChange={setPanelTab}
            onSuccess={onManageSuccess}
            isClaiming={activeCard?.isClaiming}
            onClaim={activeCard?.onClaim}
          />
        ) : null}
      </div>

      {calculatorProps ? (
        <GenesisRevenueShareCalculator
          capUsd={calculatorProps.capUsd}
          yieldRevSharePct={calculatorProps.yieldRevSharePct}
          initialDepositUsd={calculatorProps.initialDepositUsd}
        />
      ) : null}

      <GenesisVoyageInfoFooter />

      {children}
    </div>
  );
}
