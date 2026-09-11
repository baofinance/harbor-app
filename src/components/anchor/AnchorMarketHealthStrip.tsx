"use client";

import {
  DEPOSIT_SECTION_LABEL_CLASS,
  DEPOSIT_TAG_CORAL_CLASS,
  DEPOSIT_TAG_MINT_CLASS,
  DEPOSIT_TAG_NEUTRAL_CLASS,
  DEPOSIT_OVERVIEW_CARD_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type {
  MarketHealthStatus,
  MarketLiquidityStatus,
} from "@/utils/anchorMarketHealth";
import {
  formatMarketCrPercent,
  formatMaxMintableHaAndUsd,
  marketHealthStatusLabel,
  marketLiquidityStatusLabel,
} from "@/utils/anchorMarketHealth";

export type AnchorMarketHealthStripProps = {
  collateralRatio: bigint | undefined;
  maxMintableUsd: number | undefined;
  maxMintableHa?: number | undefined;
  maxMintableHaSymbol?: string;
  healthStatus: MarketHealthStatus;
  liquidityStatus: MarketLiquidityStatus;
  isLoading?: boolean;
};

function healthTagClass(status: MarketHealthStatus): string {
  if (status === "stressed") return DEPOSIT_TAG_CORAL_CLASS;
  if (status === "watch" || status === "unknown") return DEPOSIT_TAG_NEUTRAL_CLASS;
  return DEPOSIT_TAG_MINT_CLASS;
}

function liquidityTagClass(status: MarketLiquidityStatus): string {
  if (status === "unknown") return DEPOSIT_TAG_NEUTRAL_CLASS;
  return status === "liquid"
    ? DEPOSIT_TAG_MINT_CLASS
    : DEPOSIT_TAG_CORAL_CLASS;
}

/** Compact CR + capacity strip between Amount and Transaction Overview. */
export function AnchorMarketHealthStrip({
  collateralRatio,
  maxMintableUsd,
  maxMintableHa,
  maxMintableHaSymbol = "ha",
  healthStatus,
  liquidityStatus,
  isLoading = false,
}: AnchorMarketHealthStripProps) {
  return (
    <div className="space-y-1">
      <p className={DEPOSIT_SECTION_LABEL_CLASS}>Market Health</p>
      <div className={`${DEPOSIT_OVERVIEW_CARD_CLASS} space-y-2`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm font-bold tabular-nums text-[#1E4775]">
            CR {isLoading ? "…" : formatMarketCrPercent(collateralRatio)}
          </span>
          <span className={healthTagClass(healthStatus)}>
            {marketHealthStatusLabel(healthStatus)}
          </span>
          <span className={liquidityTagClass(liquidityStatus)}>
            {marketLiquidityStatusLabel(liquidityStatus)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#1E4775]/45">
            Max mintable
          </span>
          <span className="max-w-[70%] text-right font-mono text-sm font-bold tabular-nums text-[#1E4775]">
            {isLoading
              ? "…"
              : formatMaxMintableHaAndUsd({
                  haAmount: maxMintableHa,
                  haSymbol: maxMintableHaSymbol,
                  usd: maxMintableUsd,
                })}
          </span>
        </div>
      </div>
    </div>
  );
}
