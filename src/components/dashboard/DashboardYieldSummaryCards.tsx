"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import {
  DASHBOARD_METRIC_CHIP_VALUE_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_YIELD_CLASS,
} from "./dashboardStyles";

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
        icon={
          <span className={`${DASHBOARD_PRODUCT_ICON_EARN_CLASS} !h-8 !w-8`} aria-hidden>
            <ChartBarIcon className="h-4 w-4" />
          </span>
        }
        valueClassName={
          isConnected && totalEarned > 0
            ? "text-[#B8EBD5]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
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
        icon={
          <span className={`${DASHBOARD_PRODUCT_ICON_YIELD_CLASS} !h-8 !w-8`} aria-hidden>
            <ChartBarIcon className="h-4 w-4" />
          </span>
        }
      />
    </DashboardMetricStrip>
  );
}
