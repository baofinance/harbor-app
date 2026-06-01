"use client";

import { ArrowDownIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import { HARBOR_GENESIS_PRIMARY_CTA_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import {
  getFeaturedVoyageNumber,
  getGenesisMarketTypeLabel,
} from "@/config/maidenVoyageFeatured";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getActiveVoyageCta,
  getActiveVoyageFootnote,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { GenesisActiveVoyageMetrics } from "./GenesisActiveVoyageMetrics";
import { GenesisVoyageBenefits } from "./GenesisVoyageBenefits";
import { GenesisVoyageStatusBadge } from "./GenesisVoyageStatusBadge";

const STRIP_ICON_PX = 36;

function stripLabel(symbol: string): string {
  const s = symbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "wstETH";
  if (lower === "steth") return "stETH";
  if (lower === "hausd") return "haUSD";
  if (lower.startsWith("hs")) return `hs${s.slice(2)}`;
  if (lower.startsWith("ha")) return `ha${s.slice(2)}`;
  return s;
}

export type GenesisActiveVoyageCardProps = {
  market: GenesisMarketConfig;
  marketId: string;
  capDisplay: GenesisVoyageCapDisplay | null;
  capLoading: boolean;
  capUnavailable: boolean;
  voyageStatus: ActiveVoyageStatus;
  userDepositDisplay?: string;
  isConnected: boolean;
  isClaiming: boolean;
  onDeposit: () => void;
  onClaim: () => void;
};

export function GenesisActiveVoyageCard({
  market,
  marketId,
  capDisplay,
  capLoading,
  capUnavailable,
  voyageStatus,
  userDepositDisplay,
  isConnected,
  isClaiming,
  onDeposit,
  onClaim,
}: GenesisActiveVoyageCardProps) {
  const collateralSymbol =
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    "Collateral";
  const peggedSymbol = market.peggedToken?.symbol ?? "Anchor";
  const leveragedSymbol = market.leveragedToken?.symbol ?? "Sail";
  const marketTypeLabel = getGenesisMarketTypeLabel(market.pegTarget);
  const voyageNumber = getFeaturedVoyageNumber(marketId);

  const cta = getActiveVoyageCta(voyageStatus, {
    isClaiming,
    hasGenesisAddress: Boolean(market.addresses?.genesis),
    isConnected,
  });
  const footnote = getActiveVoyageFootnote(voyageStatus);

  const handleCtaClick = () => {
    if (cta.action === "deposit") onDeposit();
    else if (cta.action === "claim") onClaim();
  };

  return (
    <section
      className="mb-8 overflow-hidden rounded-2xl border border-[#1E4775]/15 bg-gradient-to-b from-[#FAFCFF] via-white to-[#F4F8FC] shadow-[0_12px_40px_-24px_rgba(30,71,117,0.35)]"
      aria-label="Active maiden voyage"
    >
      <div className="border-b border-[#1E4775]/10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <GenesisVoyageStatusBadge status={voyageStatus} />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#1E4775]/70">
            Maiden Voyage #{voyageNumber}
          </span>
          <span className="rounded-full border border-[#1E4775]/15 bg-[#1E4775]/8 px-2.5 py-0.5 text-[11px] font-semibold text-[#1E4775]/80">
            {marketTypeLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div
            className="flex items-center justify-center gap-2 sm:gap-3 lg:shrink-0"
            aria-label={`${stripLabel(collateralSymbol)} to ${stripLabel(peggedSymbol)} and ${stripLabel(leveragedSymbol)}`}
          >
            <div className="flex flex-col items-center gap-1">
              <TokenLogo symbol={collateralSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-[10px] font-semibold text-[#1E4775]/70">
                {stripLabel(collateralSymbol)}
              </span>
            </div>
            <ArrowDownIcon className="h-5 w-5 shrink-0 text-[#1E4775]/40" aria-hidden />
            <div className="flex flex-col items-center gap-1">
              <TokenLogo symbol={peggedSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-[10px] font-semibold text-[#1E4775]/70">
                {stripLabel(peggedSymbol)}
              </span>
            </div>
            <span className="text-lg font-light text-[#1E4775]/50">+</span>
            <div className="flex flex-col items-center gap-1">
              <TokenLogo symbol={leveragedSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-[10px] font-semibold text-[#1E4775]/70">
                {stripLabel(leveragedSymbol)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-lg">
            <GenesisActiveVoyageMetrics
              capDisplay={capDisplay}
              isLoading={capLoading}
              isUnavailable={capUnavailable}
              voyageStatus={voyageStatus}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {userDepositDisplay ? (
          <p className="mb-3 text-sm text-[#1E4775]/70">
            Your deposit:{" "}
            <span className="font-semibold text-[#1E4775]">
              {userDepositDisplay}
            </span>
          </p>
        ) : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className={`${HARBOR_GENESIS_PRIMARY_CTA_CLASS} min-h-[44px] w-full sm:w-auto sm:min-w-[220px]`}
            disabled={cta.disabled}
            onClick={handleCtaClick}
          >
            {cta.action === "claim" && isClaiming
              ? "Claiming..."
              : cta.label}
          </button>
          {footnote ? (
            <p className="text-center text-xs text-[#1E4775]/55 sm:text-left">
              {footnote}
            </p>
          ) : null}
        </div>

        <GenesisVoyageBenefits />
      </div>
    </section>
  );
}
