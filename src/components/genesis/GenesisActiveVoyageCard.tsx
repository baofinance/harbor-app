"use client";

import { ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import {
  getFeaturedVoyageNumber,
  getGenesisMarketTypeLabel,
  MAIDEN_VOYAGE_DOCS_URL,
} from "@/config/maidenVoyageFeatured";
import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getCapDataSourceLabel,
  getActiveVoyageCta,
  getActiveVoyageFootnote,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { formatVoyageCountdown } from "@/utils/formatters";
import { GenesisActiveVoyageMetrics } from "./GenesisActiveVoyageMetrics";
import { GenesisMaidenVoyageStageStrip } from "./GenesisMaidenVoyageStageStrip";
import { GenesisVoyageBenefitsWithLayout } from "./GenesisVoyageBenefits";
import { GenesisVoyageStatusBadge } from "./GenesisVoyageStatusBadge";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_OUTLINE_BUTTON,
  MV_PRIMARY_CTA,
  MV_TYPE_TAG,
} from "./maidenVoyageLayoutStyles";

const STRIP_ICON_PX = 24;

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
  stats: MaidenVoyageStatsBarData;
  capDisplay: GenesisVoyageCapDisplay | null;
  capLoading: boolean;
  capUnavailable: boolean;
  voyageStatus: ActiveVoyageStatus;
  endDate?: string;
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
  userDepositDisplay?: string;
  isConnected: boolean;
  isClaiming: boolean;
  onDeposit: () => void;
  onClaim: () => void;
};

export function GenesisActiveVoyageCard({
  market,
  marketId,
  stats,
  capDisplay,
  capLoading,
  capUnavailable,
  voyageStatus,
  endDate,
  yieldRevSharePct = null,
  genesisAddress,
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
  const dataSourceLabel = getCapDataSourceLabel(capDisplay, capLoading, capUnavailable);
  const countdownLabel =
    endDate &&
    (voyageStatus === "deposits_open" || voyageStatus === "almost_full")
      ? formatVoyageCountdown(endDate)
      : null;
  const footerLabel = countdownLabel
    ? `${countdownLabel} or when capacity is reached.`
    : footnote;

  const capUsd =
    maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null) ??
    (capDisplay?.capTotalUsd && capDisplay.capTotalUsd > 0
      ? capDisplay.capTotalUsd
      : null);
  const estimatedOwnershipPct =
    capUsd && capUsd > 0 ? (Math.min(1000, capUsd) / capUsd) * 100 : null;
  const hasUserOwnership = Boolean(capDisplay && capDisplay.ownershipShare > 0);
  const ownershipLabel = hasUserOwnership
    ? `${(capDisplay!.ownershipShare * 100).toFixed(2)}%`
    : estimatedOwnershipPct != null
      ? `${estimatedOwnershipPct.toFixed(2)}%`
      : "—";

  const handleCtaClick = () => {
    if (cta.action === "deposit") onDeposit();
    else if (cta.action === "claim") onClaim();
  };

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="Active maiden voyage"
    >
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r">
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
            className="mt-3 flex flex-wrap items-center gap-1.5"
            aria-label={`${stripLabel(collateralSymbol)} to ${stripLabel(peggedSymbol)} and ${stripLabel(leveragedSymbol)}`}
          >
            <div className="flex items-center gap-1">
              <TokenLogo symbol={collateralSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-xs font-semibold text-white/80">
                {stripLabel(collateralSymbol)}
              </span>
            </div>
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden />
            <div className="flex items-center gap-1">
              <TokenLogo symbol={peggedSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-xs font-semibold text-white/80">
                {stripLabel(peggedSymbol)}
              </span>
            </div>
            <span className="text-xs font-light text-white/40">+</span>
            <div className="flex items-center gap-1">
              <TokenLogo symbol={leveragedSymbol} size={STRIP_ICON_PX} />
              <span className="font-mono text-xs font-semibold text-white/80">
                {stripLabel(leveragedSymbol)}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/45">
                  Capacity
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/90">
                  {capDisplay
                    ? capDisplay.useTokenCap
                      ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)}`
                      : `$${capDisplay.capCurrentUsd.toFixed(0)} / $${capDisplay.capTotalUsd.toFixed(0)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/45">
                  {hasUserOwnership ? "Your share" : "Est. at $1k"}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/90">
                  {ownershipLabel}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/45">
                  Revenue share
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/90">
                  {yieldRevSharePct != null ? `${yieldRevSharePct}%` : "—"}
                </p>
              </div>
            </div>
            <GenesisActiveVoyageMetrics
              capDisplay={capDisplay}
              isLoading={capLoading}
              isUnavailable={capUnavailable}
              voyageStatus={voyageStatus}
            />
          </div>

          <div className="mt-4">
            {userDepositDisplay ? (
              <p className="mb-3 text-sm text-white/60">
                Your deposit:{" "}
                <span className="font-semibold text-white/90">
                  {userDepositDisplay}
                </span>
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={`${MV_PRIMARY_CTA} min-h-[44px] sm:flex-1`}
                disabled={cta.disabled}
                onClick={handleCtaClick}
              >
                {cta.action === "claim" && isClaiming ? "Claiming..." : cta.label}
              </button>
              <a
                href={MAIDEN_VOYAGE_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${MV_OUTLINE_BUTTON} min-h-[44px] justify-center px-5`}
              >
                How it works
              </a>
            </div>

            {footerLabel ? (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-white/45">
                <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {footerLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <GenesisVoyageBenefitsWithLayout layout="list" />
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3 sm:px-6">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
            Markets launched: {stats.completedLaunchesCount}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
            Featured TVL: {stats.featuredTvlLabel ?? "—"}
          </span>
          {dataSourceLabel ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
              {dataSourceLabel}
            </span>
          ) : null}
        </div>
        <GenesisMaidenVoyageStageStrip status={voyageStatus} />
      </div>
    </section>
  );
}
