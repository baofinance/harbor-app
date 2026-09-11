"use client";

import type { ReactNode } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import { formatUSD } from "@/utils/formatters";
import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
} from "@/components/sail/advanced/sailAdvancedStyles";

export type SailWalletStatsStripProps = {
  isConnected: boolean;
  sailUserStats: {
    totalPositionsUSD: number;
    positionsCount: number;
  };
  pnlFromMarkets: {
    totalPnL: number;
    pnlPercent: number | null;
  };
  pnlSummaryLoading: boolean;
  isLoadingSailMarks: boolean;
  totalSailMarks: number;
  /** Shown in the Marks info tooltip on hover. */
  marksPerDay?: number;
  showSailMarks?: boolean;
  /** When true, stats grid sits inside a parent frosted shell (no outer card). */
  embedded?: boolean;
  className?: string;
};

const SAIL_WALLET_STATS_CELL =
  "flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4";

function formatSailMarks(value: number): string {
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

function formatPnL(
  pnlFromMarkets: SailWalletStatsStripProps["pnlFromMarkets"],
  loading: boolean,
  isConnected: boolean,
): { text: string; valueClassName: string } {
  if (!isConnected) {
    return { text: "—", valueClassName: SAIL_ADVANCED_HEADER_STRIP_VALUE };
  }
  if (loading) {
    return { text: "…", valueClassName: SAIL_ADVANCED_HEADER_STRIP_VALUE };
  }

  const { totalPnL, pnlPercent } = pnlFromMarkets;
  if (!totalPnL) {
    return { text: "$0.00", valueClassName: SAIL_ADVANCED_HEADER_STRIP_VALUE };
  }

  const dollar =
    totalPnL >= 0
      ? `+$${totalPnL.toFixed(2)}`
      : `-$${Math.abs(totalPnL).toFixed(2)}`;
  const pctText =
    pnlPercent === null || !Number.isFinite(pnlPercent)
      ? ""
      : ` (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`;

  return {
    text: `${dollar}${pctText}`,
    valueClassName:
      totalPnL > 0
        ? `${SAIL_ADVANCED_HEADER_STRIP_VALUE} text-[#2d6b5c]`
        : totalPnL < 0
          ? `${SAIL_ADVANCED_HEADER_STRIP_VALUE} text-[#c45c4e]`
          : SAIL_ADVANCED_HEADER_STRIP_VALUE,
  };
}

function StatCell({
  label,
  value,
  valueClassName = SAIL_ADVANCED_HEADER_STRIP_VALUE,
  labelExtra,
}: {
  label: ReactNode;
  value: string;
  valueClassName?: string;
  labelExtra?: ReactNode;
}) {
  return (
    <div className={SAIL_WALLET_STATS_CELL}>
      <span
        className={`${SAIL_ADVANCED_HEADER_STRIP_LABEL} inline-flex items-center justify-center gap-1`}
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

function stripShell(embedded: boolean, className: string): string {
  if (embedded) {
    return `grid w-full ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} ${className}`.trim();
  }
  return `${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid w-full ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} ${className}`.trim();
}

/** Compact header wallet stats — single frosted row beside the market dropdown. */
export function SailWalletStatsStrip({
  isConnected,
  sailUserStats,
  pnlFromMarkets,
  pnlSummaryLoading,
  isLoadingSailMarks,
  totalSailMarks,
  marksPerDay = 0,
  showSailMarks = true,
  embedded = false,
  className = "",
}: SailWalletStatsStripProps) {
  const pnl = formatPnL(pnlFromMarkets, pnlSummaryLoading, isConnected);
  const marksValue = isLoadingSailMarks ? "…" : formatSailMarks(totalSailMarks);
  const gridClass = showSailMarks
    ? "grid-cols-2 sm:grid-cols-4 sm:divide-y-0"
    : "grid-cols-3 sm:divide-y-0";
  const shellClass = stripShell(embedded, `${gridClass} ${className}`);

  if (!isConnected) {
    return (
      <div
        className={stripShell(embedded, `grid-cols-1 ${className}`)}
        aria-label="Your Sail wallet"
      >
        <SailConnectWalletStripNotice message="Connect your wallet to view portfolio stats." />
      </div>
    );
  }

  return (
    <div className={shellClass} aria-label="Your Sail wallet">
      <StatCell
        label="Leverage Portfolio"
        value={formatUSD(sailUserStats.totalPositionsUSD, { compact: false })}
      />
      <StatCell
        label="Positions"
        value={String(sailUserStats.positionsCount)}
      />
      <StatCell
        label="PnL"
        value={pnl.text}
        valueClassName={pnl.valueClassName}
      />
      {showSailMarks ? (
        <StatCell
          label="Marks"
          value={marksValue}
          labelExtra={
            <InfoTooltip
              label={
                <div className="space-y-2 text-left">
                  <p className="text-sm font-semibold text-white">
                    {isLoadingSailMarks ? "…" : formatMarksPerDay(marksPerDay)}
                  </p>
                  <p className="text-xs leading-relaxed text-white/85">
                    Marks are earned by holding sail tokens in leverage
                    markets.
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
      ) : null}
    </div>
  );
}

/** @deprecated Use `SailWalletStatsStrip` with default `showSailMarks`. */
export function SailWalletMarksChip({
  isLoadingSailMarks,
  totalSailMarks,
  className = "",
}: Pick<
  SailWalletStatsStripProps,
  "isLoadingSailMarks" | "totalSailMarks" | "className"
>) {
  const marksValue = isLoadingSailMarks ? "…" : formatSailMarks(totalSailMarks);

  return (
    <div
      className={`${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid ${className}`.trim()}
      style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
      aria-label="Marks"
    >
      <StatCell label="Marks" value={marksValue} />
    </div>
  );
}
