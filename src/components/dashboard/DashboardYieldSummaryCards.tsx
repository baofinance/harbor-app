"use client";

import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import { DASHBOARD_METRIC_CHIP_VALUE_CLASS } from "./dashboardStyles";

export type DashboardYieldSummaryCardsProps = {
  totalEarned: number;
  totalOutstanding: number;
  isConnected: boolean;
};

export function DashboardYieldSummaryCards({
  totalEarned,
  totalOutstanding,
  isConnected,
}: DashboardYieldSummaryCardsProps) {
  const dash = "—";

  return (
    <DashboardMetricStrip inline>
      <DashboardMetricChip
        label="Total earned"
        value={isConnected ? formatUSD(totalEarned, { compact: false }) : dash}
        inline
      />
      <DashboardMetricChip
        label="Uncollected"
        value={
          isConnected ? formatUSD(totalOutstanding, { compact: false }) : dash
        }
        valueClassName={
          isConnected && totalOutstanding > 0
            ? "text-[#FF8A7A]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
        inline
      />
    </DashboardMetricStrip>
  );
}
