"use client";

import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { formatUSD } from "@/utils/formatters";

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
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={SAIL_WALLET_STATS_CELL}>
      <span className={SAIL_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
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
        <StatCell label="Sail marks" value={marksValue} />
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
      aria-label="Sail marks"
    >
      <StatCell label="Sail marks" value={marksValue} />
    </div>
  );
}
