"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { GenesisActiveVoyageCardProps } from "@/components/genesis/GenesisActiveVoyageCard";
import { GenesisActiveVoyageCard } from "@/components/genesis/GenesisActiveVoyageCard";
import { GenesisMaidenVoyageWhyJoinCard } from "@/components/genesis/GenesisMaidenVoyageWhyJoinCard";
import { GenesisVoyageRewardsCard } from "@/components/genesis/GenesisVoyageRewardsCard";
import { GenesisRevenueShareCalculator } from "@/components/genesis/GenesisRevenueShareCalculator";
import { resolveRevenueShareCalculatorProps } from "@/utils/maidenVoyageYieldShareEstimate";
import { GenesisVoyageHeader } from "./GenesisVoyageHeader";
import { GenesisVoyageStatsStrip } from "./GenesisVoyageStatsStrip";
import { GenesisVoyageActionPanel } from "./GenesisVoyageActionPanel";
import { GenesisHowItWorksModal } from "./GenesisHowItWorksModal";
import type { GenesisVoyageOption } from "./GenesisChainVoyageSelectors";
import { SAIL_ADVANCED_MAIN_GRID_CLASS, GENESIS_TRADE_PANEL_ID } from "./genesisAdvancedStyles";

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
  const [panelTab, setPanelTab] = useState<"deposit" | "how">("deposit");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

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
    // Deposit Now → panel (desktop) or manage modal (mobile).
    // Claim still uses activeCard.onClaim via the card CTA switch.
    focusDepositPanel();
  }, [focusDepositPanel]);

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
        onHowItWorks: () => setHowItWorksOpen(true),
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
      />

      <GenesisVoyageStatsStrip
        voyageStatus={activeCard?.voyageStatus ?? null}
        capDisplay={activeCard?.capDisplay ?? null}
        capLoading={activeCard?.capLoading}
        yieldRevSharePct={activeCard?.yieldRevSharePct ?? null}
        genesisAddress={activeCard?.genesisAddress}
        userDepositUsd={activeCard?.userDepositUsd}
      />

      <div
        id="maiden-voyage-active"
        className={`${SAIL_ADVANCED_MAIN_GRID_CLASS} scroll-mt-24`}
      >
        <div className="min-w-0 lg:h-full">
          {resolvedCard ? (
            <GenesisActiveVoyageCard
              {...resolvedCard}
              className="h-full w-full"
            />
          ) : (
            <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-sm text-white/60">
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
          />
        ) : null}
      </div>

      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch"
        aria-label="Why join and what you receive"
      >
        <GenesisMaidenVoyageWhyJoinCard className="h-full" />
        <GenesisVoyageRewardsCard className="h-full" />
      </section>

      {calculatorProps ? (
        <GenesisRevenueShareCalculator
          capUsd={calculatorProps.capUsd}
          yieldRevSharePct={calculatorProps.yieldRevSharePct}
          initialDepositUsd={calculatorProps.initialDepositUsd}
        />
      ) : null}

      {children}

      <GenesisHowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </div>
  );
}
