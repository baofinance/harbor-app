"use client";

import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { HarborBasicMarketStatusRow } from "@/components/market-cards/HarborBasicMarketStatusRow";
import { HarborMarketTokenFlowStrip } from "@/components/market-cards/HarborMarketTokenFlowStrip";
import {
  getFeaturedVoyageNumber,
  getGenesisMarketTypeLabel,
  MAIDEN_VOYAGE_DOCS_URL,
} from "@/config/maidenVoyageFeatured";
import { isGenesisSoonUi } from "@/config/markets";
import { HARBOR_COMING_SOON_CTA_SURFACE_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getActiveVoyageCta,
  getActiveVoyageFootnote,
  getActiveVoyageZeroStateCopy,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { formatUSD } from "@/utils/formatters";
import { resolveMaidenVoyageYieldShareLabel } from "@/utils/maidenVoyageYieldShareEstimate";
import { INDEX_CORAL_INFO_TAG_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import { HARBOR_LEARN_MORE_DARK_LINK_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import { GenesisVoyageCompletedNotice } from "./GenesisVoyageCompletedNotice";
import { FeaturedVoyageChainMark } from "./GenesisMarketSharedRowCells";
import {
  GenesisMaidenVoyageStageLabel,
  GenesisMaidenVoyageStageStrip,
} from "./GenesisMaidenVoyageStageStrip";
import { getMaidenVoyageLeveragedFlowLabel } from "@/utils/genesisDisplay";
import { GenesisVoyageStatusBadge } from "./GenesisVoyageStatusBadge";
import { HARBOR_BTN_GLASS_ICON_DARK } from "@/components/shared/harborButtonStyles";
import { GENESIS_VOYAGE_CARD_FOOTER_HEIGHT } from "./advanced/genesisAdvancedStyles";
import {
  MV_ACCENT_GRADIENT,
  MV_CAPTION_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_FOOTER_PANEL,
  MV_METRIC_STAT_COLUMN,
  MV_META_TEXT,
  MV_PRIMARY_CTA,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
  MV_TEXT_ON_GLASS,
  MV_PREVIEW_SOON_CONTENT_DIM_CLASS,
  MV_PREVIEW_SOON_VEIL_CLASS,
  MV_PREVIEW_SOON_BADGE_CLASS,
  MV_PREVIEW_COMPLETED_CONTENT_DIM_CLASS,
  MV_PREVIEW_COMPLETED_VEIL_CLASS,
  MV_PREVIEW_COMPLETED_BADGE_CLASS,
} from "./maidenVoyageLayoutStyles";

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

function formatRemainingToken(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000) return amount.toFixed(0);
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(4);
}

type ActiveVoyageMetricsProps = {
  capDisplay: GenesisVoyageCapDisplay | null;
  isLoading: boolean;
  isUnavailable: boolean;
  voyageStatus: ActiveVoyageStatus;
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
  userDepositUsd?: number | null;
};

function ActiveVoyageMetrics({
  capDisplay,
  isLoading,
  isUnavailable,
  voyageStatus,
  yieldRevSharePct = null,
  genesisAddress,
  userDepositUsd = null,
}: ActiveVoyageMetricsProps) {
  if (isLoading) {
    return (
      <div
        className="h-20 animate-pulse rounded-xl bg-white/[0.08]"
        aria-label="Loading capacity"
      />
    );
  }

  if (isUnavailable || !capDisplay) {
    return (
      <p className="text-sm text-white/60">Capacity data unavailable</p>
    );
  }

  const { filledPct, capFilled } = capDisplay;
  const progressWidth = `${Math.min(100, Math.max(0, filledPct))}%`;

  const capacityFractionLabel = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)} ${stripLabel(capDisplay.collateralSymbol)}`
    : `${formatUSD(capDisplay.capCurrentUsd)} / ${formatUSD(capDisplay.capTotalUsd)}`;

  const remainingLabel = capDisplay.useTokenCap
    ? `${formatRemainingToken(capDisplay.remaining)} ${stripLabel(capDisplay.collateralSymbol)} remaining`
    : `${formatUSD(capDisplay.remainingUsd)} remaining`;

  const zeroState = getActiveVoyageZeroStateCopy(voyageStatus, filledPct);
  const ownership = resolveMaidenVoyageYieldShareLabel({
    capDisplay,
    genesisAddress,
    yieldRevSharePct,
    userDepositUsd,
  });
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] lg:items-center lg:gap-0">
      <div className="min-w-0 lg:pr-4">
        <p className={MV_SECTION_LABEL}>Voyage Capacity</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none sm:text-3xl">
          <span className={MV_ACCENT_GRADIENT}>{filledPct.toFixed(0)}%</span>{" "}
          <span className="text-lg font-bold uppercase text-white/90 sm:text-xl">
            filled
          </span>
        </p>

        <div
          className={`mt-2 h-3 ${MV_PROGRESS_TRACK}`}
          role="progressbar"
          aria-valuenow={Math.round(filledPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Deposit cap progress"
        >
          <div
            className={capFilled ? MV_PROGRESS_FILL_COMPLETE : MV_PROGRESS_FILL}
            style={{ width: progressWidth }}
          />
        </div>

        <div
          className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 ${MV_CAPTION_TEXT} ${MV_TEXT_ON_GLASS}`}
        >
          <span className="font-mono font-semibold tabular-nums text-white/80">
            {capacityFractionLabel}
          </span>
          <span className="font-mono font-semibold tabular-nums text-[#FF8A7A]">
            {remainingLabel}
          </span>
        </div>

        {zeroState ? (
          <p className={`mt-1.5 ${MV_CAPTION_TEXT} text-[#B8EBD5]`}>
            {zeroState.line1}
          </p>
        ) : null}
      </div>

      <div
        className={`min-w-0 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:px-4 lg:pt-0 ${MV_METRIC_STAT_COLUMN}`}
      >
        <p className={MV_SECTION_LABEL}>Est. Your Share</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-white/95 sm:text-3xl">
          {ownership.label}
        </p>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>{ownership.caption}</p>
      </div>

      <div
        className={`min-w-0 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 ${MV_METRIC_STAT_COLUMN}`}
      >
        <p className={MV_SECTION_LABEL}>Revenue Share</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-white/95 sm:text-3xl">
          {yieldRevSharePct != null ? `${yieldRevSharePct}%` : "—"}
        </p>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>Eligible pool share</p>
      </div>
    </div>
  );
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
  userDepositUsd?: number | null;
  isConnected: boolean;
  isClaiming: boolean;
  onDeposit: () => void;
  onClaim: () => void;
  /** Opens How it works modal (product overlay). Falls back to docs link if omitted. */
  onHowItWorks?: () => void;
  /** Cycles featured hero among active campaigns (e.g. ETH → MegaETH). */
  onNextMarket?: () => void;
  /** @deprecated Card always renders with shell; kept for call-site compatibility. */
  embedded?: boolean;
  className?: string;
};

export function GenesisActiveVoyageCard({
  market,
  marketId,
  stats: _stats,
  capDisplay,
  capLoading,
  capUnavailable,
  voyageStatus,
  endDate: _endDate,
  yieldRevSharePct = null,
  genesisAddress,
  userDepositDisplay,
  userDepositUsd = null,
  isConnected,
  isClaiming,
  onDeposit,
  onClaim,
  onHowItWorks,
  onNextMarket,
  className = "",
}: GenesisActiveVoyageCardProps) {
  const collateralSymbol =
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    "Collateral";
  const peggedSymbol = market.peggedToken?.symbol ?? "Anchor";
  const leveragedSymbol = market.leveragedToken?.symbol ?? "Sail";
  const marketTypeLabel = getGenesisMarketTypeLabel(market.pegTarget);
  const voyageNumber = getFeaturedVoyageNumber(marketId);
  const leveragedFlowLabel = getMaidenVoyageLeveragedFlowLabel(
    collateralSymbol,
    market.pegTarget
  );
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

  const depositStatusLabel = userDepositDisplay
    ? `Your deposit · ${userDepositDisplay}`
    : undefined;

  const chainName = market.chain?.name ?? "Ethereum";
  const chainLogo = market.chain?.logo ?? "icons/eth.png";
  const previewSoon = isGenesisSoonUi(market);
  const previewCompleted =
    !previewSoon &&
    (voyageStatus === "launch_complete" || voyageStatus === "claim_available");
  const contentDimClass = previewSoon
    ? MV_PREVIEW_SOON_CONTENT_DIM_CLASS
    : previewCompleted
      ? MV_PREVIEW_COMPLETED_CONTENT_DIM_CLASS
      : "";

  return (
    <section
      key={marketId}
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} relative flex flex-col overflow-hidden ${className}`}
      aria-label="Active maiden voyage"
    >
      {previewSoon ? (
        <>
          <div aria-hidden className={MV_PREVIEW_SOON_VEIL_CLASS} />
          <div className="pointer-events-none absolute inset-x-0 top-[36%] z-[6] flex justify-center px-4">
            <span className={MV_PREVIEW_SOON_BADGE_CLASS}>COMING SOON</span>
          </div>
        </>
      ) : previewCompleted ? (
        <>
          <div aria-hidden className={MV_PREVIEW_COMPLETED_VEIL_CLASS} />
          <div className="pointer-events-none absolute inset-x-0 top-[36%] z-[6] flex justify-center px-4">
            <span className={MV_PREVIEW_COMPLETED_BADGE_CLASS}>COMPLETED</span>
          </div>
        </>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-5 ${contentDimClass}`}
      >
        <div className="flex flex-col gap-2 border-b border-white/15 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            <FeaturedVoyageChainMark chainName={chainName} chainLogo={chainLogo} />
            <GenesisVoyageStatusBadge status={voyageStatus} />
            <span className="min-w-0 text-sm font-semibold text-white/95">
              Maiden Voyage #{voyageNumber}
            </span>
            <GenesisMaidenVoyageStageLabel
              status={voyageStatus}
              className="w-full sm:w-auto sm:shrink-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span className={INDEX_CORAL_INFO_TAG_CLASS}>{marketTypeLabel}</span>
            {onNextMarket ? (
              <button
                type="button"
                onClick={onNextMarket}
                className={`${HARBOR_BTN_GLASS_ICON_DARK} h-8 w-8`}
                aria-label="Next Maiden Voyage market"
              >
                <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/15 py-3 sm:min-h-[52px] sm:flex-row sm:items-stretch sm:gap-0 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center justify-center px-1 sm:min-w-[6.5rem] sm:px-3 lg:min-w-[7rem] lg:px-4">
            {isConnected && depositStatusLabel ? (
              <HarborBasicMarketStatusRow
                theme="dark"
                variant="deposit"
                label={depositStatusLabel}
                className="justify-center"
              />
            ) : (
              <HarborBasicMarketStatusRow
                theme="dark"
                variant="no-deposit"
                className="justify-center"
              />
            )}
          </div>
          <div
            className="hidden w-px shrink-0 self-stretch bg-white/15 sm:block"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 items-center justify-center border-t border-white/10 pt-3 sm:flex-[1.2] sm:border-t-0 sm:px-2 sm:pt-0 lg:px-3">
            <HarborMarketTokenFlowStrip
              theme="dark"
              variant="inline"
              className="w-full max-w-full"
              collateralSymbol={collateralSymbol}
              peggedSymbol={peggedSymbol}
              leveragedSymbol={leveragedSymbol}
              leveragedDisplayLabel={leveragedFlowLabel}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <ActiveVoyageMetrics
            capDisplay={capDisplay}
            isLoading={capLoading}
            isUnavailable={capUnavailable}
            voyageStatus={voyageStatus}
            yieldRevSharePct={yieldRevSharePct}
            genesisAddress={genesisAddress}
            userDepositUsd={userDepositUsd}
          />
        </div>

        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <button
              type="button"
              className={
                previewSoon ||
                (previewCompleted && voyageStatus === "launch_complete")
                  ? `${HARBOR_COMING_SOON_CTA_SURFACE_CLASS} min-h-[44px] sm:flex-1`
                  : `${MV_PRIMARY_CTA} min-h-[44px] sm:flex-1`
              }
              disabled={previewSoon || cta.disabled}
              onClick={handleCtaClick}
            >
              {previewSoon
                ? "Coming soon"
                : previewCompleted && voyageStatus === "launch_complete"
                  ? "Completed"
                  : cta.action === "claim" && isClaiming
                    ? "Claiming..."
                    : cta.label}
            </button>
            {onHowItWorks ? (
              <button
                type="button"
                onClick={onHowItWorks}
                className={`${HARBOR_LEARN_MORE_DARK_LINK_CLASS} min-h-[44px] items-center sm:shrink-0 sm:px-3`}
              >
                How it works
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : (
              <a
                href={MAIDEN_VOYAGE_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${HARBOR_LEARN_MORE_DARK_LINK_CLASS} min-h-[44px] items-center sm:shrink-0 sm:px-3`}
              >
                How it works
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
              </a>
            )}
          </div>

          {footnote ? (
            <p className={`mt-2 text-center sm:text-left ${MV_META_TEXT}`}>
              {footnote}
            </p>
          ) : null}
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <GenesisVoyageCompletedNotice compact />
        </div>
      </div>

      <footer
        className={`${MV_FOOTER_PANEL} ${GENESIS_VOYAGE_CARD_FOOTER_HEIGHT} px-4 sm:px-5 ${contentDimClass}`}
      >
        <GenesisMaidenVoyageStageStrip status={voyageStatus} showHeading={false} />
      </footer>
    </section>
  );
}
