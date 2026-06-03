"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
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
import { GenesisActiveVoyageMetrics } from "./GenesisActiveVoyageMetrics";
import { GenesisMaidenVoyageStageStrip } from "./GenesisMaidenVoyageStageStrip";
import { GenesisVoyageStatusBadge } from "./GenesisVoyageStatusBadge";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_CAPTION_TEXT,
  MV_FOOTER_PANEL,
  MV_META_TEXT,
  MV_OUTLINE_BUTTON,
  MV_PRIMARY_CTA,
  MV_TYPE_TAG,
} from "./maidenVoyageLayoutStyles";

const STRIP_ICON_PX = 18;

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
  /** @deprecated Card always renders with shell; kept for call-site compatibility. */
  embedded?: boolean;
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
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="Active maiden voyage"
    >
      <div className="px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <GenesisVoyageStatusBadge status={voyageStatus} />
              <span className="text-sm font-semibold text-white/95">
                Maiden Voyage #{voyageNumber}
              </span>
            </div>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-1"
              aria-label={`${stripLabel(collateralSymbol)} to ${stripLabel(peggedSymbol)} and ${stripLabel(leveragedSymbol)}`}
            >
              <div className="flex items-center gap-1">
                <TokenLogo symbol={collateralSymbol} size={STRIP_ICON_PX} />
                <span className={`font-mono ${MV_CAPTION_TEXT} font-semibold text-white/85`}>
                  {stripLabel(collateralSymbol)}
                </span>
              </div>
              <ArrowRightIcon className="h-3 w-3 shrink-0 text-white/50" aria-hidden />
              <div className="flex items-center gap-1">
                <TokenLogo symbol={peggedSymbol} size={STRIP_ICON_PX} />
                <span className={`font-mono ${MV_CAPTION_TEXT} font-semibold text-white/85`}>
                  {stripLabel(peggedSymbol)}
                </span>
              </div>
              <span className={`${MV_CAPTION_TEXT} font-light text-white/50`}>+</span>
              <div className="flex items-center gap-1">
                <TokenLogo symbol={leveragedSymbol} size={STRIP_ICON_PX} />
                <span className={`font-mono ${MV_CAPTION_TEXT} font-semibold text-white/85`}>
                  {stripLabel(leveragedSymbol)}
                </span>
              </div>
            </div>
          </div>
          <span className={MV_TYPE_TAG}>{marketTypeLabel}</span>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <GenesisActiveVoyageMetrics
            capDisplay={capDisplay}
            isLoading={capLoading}
            isUnavailable={capUnavailable}
            voyageStatus={voyageStatus}
            yieldRevSharePct={yieldRevSharePct}
            genesisAddress={genesisAddress}
          />
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          {userDepositDisplay ? (
            <p className={`mb-2 ${MV_CAPTION_TEXT} text-white/80`}>
              Your deposit:{" "}
              <span className="font-semibold text-white/95">
                {userDepositDisplay}
              </span>
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              className={`${MV_PRIMARY_CTA} min-h-[40px] sm:flex-1`}
              disabled={cta.disabled}
              onClick={handleCtaClick}
            >
              {cta.action === "claim" && isClaiming ? "Claiming..." : cta.label}
            </button>
            <a
              href={MAIDEN_VOYAGE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MV_OUTLINE_BUTTON} min-h-[40px] justify-center px-4 sm:shrink-0`}
            >
              How it works
            </a>
          </div>

          {footnote ? (
            <p className={`mt-1.5 text-center sm:text-left ${MV_META_TEXT}`}>
              {footnote}
            </p>
          ) : null}
        </div>
      </div>

      <footer className={`${MV_FOOTER_PANEL} px-4 py-2 sm:px-5`}>
        <GenesisMaidenVoyageStageStrip status={voyageStatus} />
      </footer>
    </section>
  );
}
