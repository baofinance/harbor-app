"use client";

import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";

export type DashboardPositionSummaryCardsProps = {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
  showArchived: boolean;
  isConnected: boolean;
  /** Render chips only — for embedding in a shared stat strip. */
  bare?: boolean;
};

export function DashboardPositionSummaryCards({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
  bare = false,
}: DashboardPositionSummaryCardsProps) {
  const totalExposure = maidenUsd + earnUsd + sailUsd;
  const dash = "—";

  const chips = (
    <>
      <DashboardMetricChip
        label="Total exposure"
        value={isConnected ? formatUSD(totalExposure, { compact: false }) : dash}
        inline
      />
      <DashboardMetricChip
        label="Maiden Voyage"
        value={isConnected ? formatUSD(maidenUsd, { compact: false }) : dash}
        inline
      />
      <DashboardMetricChip
        label="Earn"
        value={isConnected ? formatUSD(earnUsd, { compact: false }) : dash}
        inline
      />
      <DashboardMetricChip
        label="Sail"
        value={isConnected ? formatUSD(sailUsd, { compact: false }) : dash}
        inline
      />
      {showArchived ? (
        <DashboardMetricChip
          label="Archived"
          value={isConnected ? formatUSD(archivedUsd, { compact: false }) : dash}
          inline
        />
      ) : null}
    </>
  );

  if (bare) return chips;

  return (
    <DashboardMetricStrip inline scroll>
      {chips}
    </DashboardMetricStrip>
  );
}
