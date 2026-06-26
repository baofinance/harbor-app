"use client";

import { DashboardMetricChip } from "@/components/dashboard/DashboardMetricChip";
import { DashboardMetricStrip } from "@/components/dashboard/DashboardSummaryStrip";
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
  className?: string;
};

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
): { text: string; valueClassName?: string } {
  if (!isConnected) return { text: "—" };
  if (loading) return { text: "…" };

  const { totalPnL, pnlPercent } = pnlFromMarkets;
  if (!totalPnL) return { text: "$0.00" };

  const dollar = `$${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}`;
  const pctText =
    pnlPercent === null || !Number.isFinite(pnlPercent)
      ? ""
      : ` (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`;

  return {
    text: `${dollar}${pctText}`,
    valueClassName:
      totalPnL > 0
        ? "font-mono text-sm tabular-nums font-semibold text-harbor-mint sm:text-base"
        : totalPnL < 0
          ? "font-mono text-sm tabular-nums font-semibold text-harbor-coral sm:text-base"
          : undefined,
  };
}

/** Frosted wallet summary chips — matches dashboard stat strips. */
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
      className={`flex min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
      aria-label="Your Sail wallet"
    >
      <DashboardMetricStrip inline>
        <DashboardMetricChip
          label="Sail value"
          value={
            isConnected
              ? formatUSD(sailUserStats.totalPositionsUSD, { compact: false })
              : dash
          }
          inline
        />
        <DashboardMetricChip
          label="Positions"
          value={
            isConnected ? String(sailUserStats.positionsCount) : dash
          }
          inline
        />
        <DashboardMetricChip
          label="PnL"
          value={pnl.text}
          valueClassName={pnl.valueClassName}
          inline
        />
        <DashboardMetricChip
          label="Sail marks"
          value={marksValue}
          inline
        />
      </DashboardMetricStrip>
    </div>
  );
}
