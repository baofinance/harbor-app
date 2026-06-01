"use client";

import { ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
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
import {
  MV_CARD_SHELL,
  MV_PRIMARY_CTA,
  MV_TYPE_TAG,
} from "./maidenVoyageLayoutStyles";

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
      className={`${MV_CARD_SHELL} overflow-hidden`}
      aria-label="Active maiden voyage"
    >
      <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <GenesisVoyageStatusBadge status={voyageStatus} />
            <span className="text-sm font-semibold text-white/90">
              Maiden Voyage #{voyageNumber}
            </span>
          </div>
          <span className={MV_TYPE_TAG}>{marketTypeLabel}</span>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          aria-label={`${stripLabel(collateralSymbol)} to ${stripLabel(peggedSymbol)} and ${stripLabel(leveragedSymbol)}`}
        >
          <div className="flex items-center gap-1.5">
            <TokenLogo symbol={collateralSymbol} size={STRIP_ICON_PX} />
            <span className="font-mono text-xs font-semibold text-white/80">
              {stripLabel(collateralSymbol)}
            </span>
          </div>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          <div className="flex items-center gap-1.5">
            <TokenLogo symbol={peggedSymbol} size={STRIP_ICON_PX} />
            <span className="font-mono text-xs font-semibold text-white/80">
              {stripLabel(peggedSymbol)}
            </span>
          </div>
          <span className="text-sm font-light text-white/40">+</span>
          <div className="flex items-center gap-1.5">
            <TokenLogo symbol={leveragedSymbol} size={STRIP_ICON_PX} />
            <span className="font-mono text-xs font-semibold text-white/80">
              {stripLabel(leveragedSymbol)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <GenesisActiveVoyageMetrics
            capDisplay={capDisplay}
            isLoading={capLoading}
            isUnavailable={capUnavailable}
            voyageStatus={voyageStatus}
          />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {userDepositDisplay ? (
          <p className="mb-3 text-sm text-white/60">
            Your deposit:{" "}
            <span className="font-semibold text-white/90">
              {userDepositDisplay}
            </span>
          </p>
        ) : null}

        <button
          type="button"
          className={`${MV_PRIMARY_CTA} min-h-[44px]`}
          disabled={cta.disabled}
          onClick={handleCtaClick}
        >
          {cta.action === "claim" && isClaiming ? "Claiming..." : cta.label}
        </button>

        {footnote ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-white/45">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {footnote}
          </p>
        ) : null}

        <GenesisVoyageBenefits />
      </div>
    </section>
  );
}
