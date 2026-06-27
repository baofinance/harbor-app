"use client";

import { formatUSD } from "@/utils/formatters";
import {
  SAIL_ADVANCED_FROSTED_CARD,
  SAIL_ADVANCED_LIGHT_LABEL,
  SAIL_ADVANCED_LIGHT_VALUE,
} from "./sailAdvancedStyles";

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

const SAIL_WALLET_STATS_GRID =
  "grid w-full divide-x divide-[#1E4775]/10";

const SAIL_WALLET_STATS_SHELL = `overflow-hidden ${SAIL_WALLET_STATS_GRID} ${SAIL_ADVANCED_FROSTED_CARD}`;

const SAIL_WALLET_STATS_EMBEDDED_SHELL = SAIL_WALLET_STATS_GRID;

const SAIL_WALLET_STATS_CELL =
  "flex min-w-0 flex-col items-center justify-center px-2 py-2 text-center sm:px-4 sm:py-2.5";

const SAIL_WALLET_STATS_LABEL = SAIL_ADVANCED_LIGHT_LABEL;

const SAIL_WALLET_STATS_VALUE = `mt-0.5 truncate ${SAIL_ADVANCED_LIGHT_VALUE} text-xs sm:text-sm`;

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
    return { text: "—", valueClassName: SAIL_WALLET_STATS_VALUE };
  }
  if (loading) {
    return { text: "…", valueClassName: SAIL_WALLET_STATS_VALUE };
  }

  const { totalPnL, pnlPercent } = pnlFromMarkets;
  if (!totalPnL) {
    return { text: "$0.00", valueClassName: SAIL_WALLET_STATS_VALUE };
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
        ? `${SAIL_WALLET_STATS_VALUE} text-harbor-mint`
        : totalPnL < 0
          ? `${SAIL_WALLET_STATS_VALUE} text-harbor-coral`
          : SAIL_WALLET_STATS_VALUE,
  };
}

function StatCell({
  label,
  value,
  valueClassName = SAIL_WALLET_STATS_VALUE,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={SAIL_WALLET_STATS_CELL}>
      <span className={SAIL_WALLET_STATS_LABEL}>{label}</span>
      <span className={valueClassName} title={value}>
        {value}
      </span>
    </div>
  );
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
  const dash = "—";
  const pnl = formatPnL(pnlFromMarkets, pnlSummaryLoading, isConnected);
  const marksValue = isLoadingSailMarks ? "…" : formatSailMarks(totalSailMarks);
  const gridClass = showSailMarks
    ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-3";
  const shellClass = embedded ? SAIL_WALLET_STATS_EMBEDDED_SHELL : SAIL_WALLET_STATS_SHELL;

  return (
    <div
      className={`${shellClass} ${gridClass} ${className}`.trim()}
      aria-label="Your Sail wallet"
    >
      <StatCell
        label="Total Leverage positions"
        value={
          isConnected
            ? formatUSD(sailUserStats.totalPositionsUSD, { compact: false })
            : dash
        }
      />
      <StatCell
        label="Positions"
        value={isConnected ? String(sailUserStats.positionsCount) : dash}
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
}: Pick<SailWalletStatsStripProps, "isLoadingSailMarks" | "totalSailMarks" | "className">) {
  const marksValue = isLoadingSailMarks ? "…" : formatSailMarks(totalSailMarks);

  return (
    <div
      className={`${SAIL_WALLET_STATS_SHELL} ${className}`.trim()}
      style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
      aria-label="Sail marks"
    >
      <StatCell label="Sail marks" value={marksValue} />
    </div>
  );
}
