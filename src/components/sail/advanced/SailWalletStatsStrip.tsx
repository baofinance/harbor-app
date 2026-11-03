"use client";

import { formatUSD } from "@/utils/formatters";
import { SAIL_ADVANCED_HEADER_STRIP_VALUE } from "@/components/sail/advanced/sailAdvancedStyles";
import {
  HarborMarksInfo,
  HarborWalletStatCell,
  HarborWalletStatsGrid,
  formatHarborMarks,
} from "@/components/shared/HarborWalletStatsGrid";

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
  const marksValue = isLoadingSailMarks ? "…" : formatHarborMarks(totalSailMarks);
  const gridClass = showSailMarks
    ? "grid-cols-2 sm:grid-cols-4 sm:divide-y-0"
    : "grid-cols-3 sm:divide-y-0";

  return (
    <HarborWalletStatsGrid
      ariaLabel="Your Sail wallet"
      isConnected={isConnected}
      columnsClass={gridClass}
      embedded={embedded}
      className={className}
    >
      <HarborWalletStatCell
        label="Leverage Portfolio"
        value={formatUSD(sailUserStats.totalPositionsUSD, { compact: false })}
      />
      <HarborWalletStatCell
        label="Positions"
        value={String(sailUserStats.positionsCount)}
      />
      <HarborWalletStatCell
        label="PnL"
        value={pnl.text}
        valueClassName={pnl.valueClassName}
      />
      {showSailMarks ? (
        <HarborWalletStatCell
          label="Marks"
          value={marksValue}
          labelExtra={
            <HarborMarksInfo
              loading={isLoadingSailMarks}
              marksPerDay={marksPerDay}
              explanation="Marks are earned by holding sail tokens in leverage markets."
            />
          }
        />
      ) : null}
    </HarborWalletStatsGrid>
  );
}
