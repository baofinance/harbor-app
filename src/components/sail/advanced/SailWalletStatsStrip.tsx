"use client";

import { HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS } from "@/components/shared/harborStatTileStyles";
import { formatUSD } from "@/utils/formatters";
import { SAIL_ADVANCED_FROSTED_CARD } from "./sailAdvancedStyles";

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
  className?: string;
};

const SAIL_WALLET_STATS_SHELL = `flex shrink-0 items-stretch overflow-x-auto ${SAIL_ADVANCED_FROSTED_CARD}`;

const SAIL_WALLET_STATS_CELL = `${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} px-2.5 py-1.5 sm:px-3`;

const SAIL_WALLET_STATS_LABEL =
  "whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-white/55";

const SAIL_WALLET_STATS_VALUE =
  "mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-white/90";

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

  const dollar = `$${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}`;
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
  minWidthClass = "min-w-[4.25rem]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
  minWidthClass?: string;
}) {
  return (
    <div className={`${SAIL_WALLET_STATS_CELL} ${minWidthClass}`}>
      <span className={SAIL_WALLET_STATS_LABEL}>{label}</span>
      <span className={valueClassName} title={value}>
        {value}
      </span>
    </div>
  );
}

function StatDivider() {
  return <div aria-hidden className="my-1.5 w-px shrink-0 bg-white/10" />;
}

/** Compact header wallet stats — single frosted row beside the market dropdown. */
export function SailWalletStatsStrip({
  isConnected,
  sailUserStats,
  pnlFromMarkets,
  pnlSummaryLoading,
  isLoadingSailMarks,
  totalSailMarks,
  className = "",
}: SailWalletStatsStripProps) {
  const dash = "—";
  const pnl = formatPnL(pnlFromMarkets, pnlSummaryLoading, isConnected);
  const marksValue = isLoadingSailMarks ? "…" : formatSailMarks(totalSailMarks);

  return (
    <div
      className={`${SAIL_WALLET_STATS_SHELL} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
      aria-label="Your Sail wallet"
    >
      <StatCell
        label="Sail value"
        value={
          isConnected
            ? formatUSD(sailUserStats.totalPositionsUSD, { compact: false })
            : dash
        }
      />
      <StatDivider />
      <StatCell
        label="Positions"
        value={isConnected ? String(sailUserStats.positionsCount) : dash}
        minWidthClass="min-w-[3.75rem]"
      />
      <StatDivider />
      <StatCell
        label="PnL"
        value={pnl.text}
        valueClassName={pnl.valueClassName}
        minWidthClass="min-w-[5.5rem] sm:min-w-[6.25rem]"
      />
      <StatDivider />
      <StatCell
        label="Sail marks"
        value={marksValue}
        minWidthClass="min-w-[4.5rem]"
      />
    </div>
  );
}
