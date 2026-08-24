"use client";

import type { ReactNode } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import { formatAPR } from "@/utils/anchor";
import { formatUSD } from "@/utils/formatters";
import {
  ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE,
  ANCHOR_ADVANCED_HEADER_STRIP_LABEL,
  ANCHOR_ADVANCED_HEADER_STRIP_SHELL,
  ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
} from "./anchorAdvancedStyles";

export type AnchorWalletStatsStripProps = {
  isConnected: boolean;
  earnPortfolioUSD: number;
  positionsCount: number;
  /** Blended vAPR from stability-pool positions (percent). */
  vaprPercent: number | null;
  isLoadingMarks: boolean;
  totalMarks: number;
  /** Shown in the Marks info tooltip on hover. */
  marksPerDay: number;
  className?: string;
};

const CELL =
  "flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4";

function formatMarks(value: number): string {
  if (value <= 0) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

function formatMarksPerDay(value: number): string {
  if (value <= 0) return "0 marks/day";
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} marks/day`;
}

function StatCell({
  label,
  value,
  valueClassName = ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
  labelExtra,
}: {
  label: ReactNode;
  value: string;
  valueClassName?: string;
  labelExtra?: ReactNode;
}) {
  return (
    <div className={CELL}>
      <span
        className={`${ANCHOR_ADVANCED_HEADER_STRIP_LABEL} inline-flex items-center justify-center gap-1`}
      >
        {label}
        {labelExtra}
      </span>
      <span className={valueClassName} title={value}>
        {value}
      </span>
    </div>
  );
}

export function AnchorWalletStatsStrip({
  isConnected,
  earnPortfolioUSD,
  positionsCount,
  vaprPercent,
  isLoadingMarks,
  totalMarks,
  marksPerDay,
  className = "",
}: AnchorWalletStatsStripProps) {
  if (!isConnected) {
    return (
      <div
        className={`${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-1 ${className}`.trim()}
        aria-label="Your Earn wallet"
      >
        <SailConnectWalletStripNotice message="Connect your wallet to view portfolio stats." />
      </div>
    );
  }

  const vaprLabel =
    vaprPercent !== null && vaprPercent > 0 ? formatAPR(vaprPercent) : "—";

  return (
    <div
      className={`${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid w-full grid-cols-2 ${ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim()}
      aria-label="Your Earn wallet"
    >
      <StatCell
        label="Earn portfolio"
        value={formatUSD(earnPortfolioUSD, { compact: false })}
      />
      <StatCell label="Positions" value={String(positionsCount)} />
      <StatCell label="vAPR" value={vaprLabel} />
      <StatCell
        label="Marks"
        value={isLoadingMarks ? "…" : formatMarks(totalMarks)}
        labelExtra={
          <InfoTooltip
            label={
              <div className="space-y-2 text-left">
                <p className="text-sm font-semibold text-white">
                  {isLoadingMarks ? "…" : formatMarksPerDay(marksPerDay)}
                </p>
                <p className="text-xs leading-relaxed text-white/85">
                  Anchor Ledger Marks are earned by holding anchor tokens and
                  depositing into stability pools.
                </p>
              </div>
            }
            side="top"
          >
            <span
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#1E4775]/35 text-[9px] font-bold leading-none text-[#1E4775]/70"
              aria-hidden
            >
              i
            </span>
          </InfoTooltip>
        }
      />
    </div>
  );
}
