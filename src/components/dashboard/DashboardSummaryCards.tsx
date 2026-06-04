"use client";

import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";

export type DashboardSummaryCardsProps = {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
  showArchived: boolean;
  isConnected: boolean;
};

export function DashboardSummaryCards({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
}: DashboardSummaryCardsProps) {
  const totalExposure = maidenUsd + earnUsd + sailUsd;
  const dash = "—";

  return (
    <DashboardMetricStrip inline>
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
    </DashboardMetricStrip>
  );
}
