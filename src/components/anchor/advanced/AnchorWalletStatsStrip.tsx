"use client";

import { formatAPR } from "@/utils/anchor";
import { formatUSD } from "@/utils/formatters";
import {
  HarborMarksInfo,
  HarborWalletStatCell,
  HarborWalletStatsGrid,
  formatHarborMarks,
} from "@/components/shared/HarborWalletStatsGrid";

export type AnchorWalletStatsStripProps = {
  isConnected: boolean;
  earnPortfolioUSD: number;
  positionsCount: number;
  /** Blended vAPR from stability-pool positions (percent). */
  vaprPercent: number | null;
  isLoadingMarks: boolean;
  /** Portfolio / positions / vAPR still loading from on-chain reads. */
  isLoadingPortfolio?: boolean;
  totalMarks: number;
  /** Shown in the Marks info tooltip on hover. */
  marksPerDay: number;
  className?: string;
};

export function AnchorWalletStatsStrip({
  isConnected,
  earnPortfolioUSD,
  positionsCount,
  vaprPercent,
  isLoadingMarks,
  isLoadingPortfolio = false,
  totalMarks,
  marksPerDay,
  className = "",
}: AnchorWalletStatsStripProps) {
  const vaprLabel = isLoadingPortfolio
    ? "…"
    : vaprPercent !== null && vaprPercent > 0
      ? formatAPR(vaprPercent)
      : "—";

  return (
    <HarborWalletStatsGrid
      ariaLabel="Your Earn wallet"
      isConnected={isConnected}
      columnsClass="grid-cols-2 sm:grid-cols-4 sm:divide-y-0"
      className={className}
    >
      <HarborWalletStatCell
        label="Earn portfolio"
        value={
          isLoadingPortfolio ? "…" : formatUSD(earnPortfolioUSD, { compact: false })
        }
      />
      <HarborWalletStatCell
        label="Positions"
        value={isLoadingPortfolio ? "…" : String(positionsCount)}
      />
      <HarborWalletStatCell label="vAPR" value={vaprLabel} />
      <HarborWalletStatCell
        label="Marks"
        value={isLoadingMarks ? "…" : formatHarborMarks(totalMarks)}
        labelExtra={
          <HarborMarksInfo
            loading={isLoadingMarks}
            marksPerDay={marksPerDay}
            explanation="Marks are earned by holding anchor tokens and depositing into stability pools."
          />
        }
      />
    </HarborWalletStatsGrid>
  );
}
