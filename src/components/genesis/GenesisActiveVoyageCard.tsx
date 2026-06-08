"use client";

import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { HarborBasicMarketStatusRow } from "@/components/market-cards/HarborBasicMarketStatusRow";
import { HarborMarketTokenFlowStrip } from "@/components/market-cards/HarborMarketTokenFlowStrip";
import {
  getFeaturedVoyageNumber,
  getGenesisMarketTypeLabel,
  MAIDEN_VOYAGE_DOCS_URL,
} from "@/config/maidenVoyageFeatured";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getActiveVoyageCta,
  getActiveVoyageFootnote,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { INDEX_CORAL_INFO_TAG_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import { HARBOR_LEARN_MORE_DARK_LINK_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import { GenesisActiveVoyageMetrics } from "./GenesisActiveVoyageMetrics";
import { FeaturedVoyageChainMark } from "./GenesisMarketSharedRowCells";
import {
  GenesisMaidenVoyageStageLabel,
  GenesisMaidenVoyageStageStrip,
} from "./GenesisMaidenVoyageStageStrip";
import { getMaidenVoyageLeveragedFlowLabel } from "@/utils/genesisDisplay";
import { GenesisVoyageStatusBadge } from "./GenesisVoyageStatusBadge";
import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_FOOTER_PANEL,
  MV_META_TEXT,
  MV_PRIMARY_CTA,
} from "./maidenVoyageLayoutStyles";

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

  return (
    <section
      key={marketId}
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} flex flex-col overflow-hidden ${className}`}
      aria-label="Active maiden voyage"
    >
      <div className="shrink-0 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <FeaturedVoyageChainMark chainName={chainName} chainLogo={chainLogo} />
            <GenesisVoyageStatusBadge status={voyageStatus} />
            <span className="shrink-0 text-sm font-semibold text-white/95">
              Maiden Voyage #{voyageNumber}
            </span>
            <GenesisMaidenVoyageStageLabel
              status={voyageStatus}
              className="shrink-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={INDEX_CORAL_INFO_TAG_CLASS}>{marketTypeLabel}</span>
            {onNextMarket ? (
              <button
                type="button"
                onClick={onNextMarket}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                aria-label="Next Maiden Voyage market"
              >
                <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[52px] w-full items-stretch border-b border-white/15 py-3 sm:py-3.5">
          <div className="flex min-w-[6.5rem] flex-1 items-center justify-center px-3 sm:min-w-[7rem] sm:px-4">
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
            className="w-px shrink-0 self-stretch bg-white/15"
            aria-hidden
          />
          <div className="flex min-w-0 flex-[1.2] items-center justify-center px-2 sm:px-3">
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

        <div className="pt-3">
          <GenesisActiveVoyageMetrics
            capDisplay={capDisplay}
            isLoading={capLoading}
            isUnavailable={capUnavailable}
            voyageStatus={voyageStatus}
            yieldRevSharePct={yieldRevSharePct}
            genesisAddress={genesisAddress}
            userDepositUsd={userDepositUsd}
          />
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
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
              className={`${HARBOR_LEARN_MORE_DARK_LINK_CLASS} min-h-[44px] items-center sm:shrink-0 sm:px-3`}
            >
              How it works
              <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>

          {footnote ? (
            <p className={`mt-2 text-center sm:text-left ${MV_META_TEXT}`}>
              {footnote}
            </p>
          ) : null}
        </div>
      </div>

      <footer
        className={`${MV_FOOTER_PANEL} flex min-h-0 flex-1 flex-col justify-center px-4 py-3 sm:px-5`}
      >
        <GenesisMaidenVoyageStageStrip status={voyageStatus} showHeading={false} />
      </footer>
    </section>
  );
}
