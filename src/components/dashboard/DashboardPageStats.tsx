"use client";

import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import { DashboardPositionSummaryCards } from "./DashboardPositionSummaryCards";
import { DashboardYieldSummaryCards } from "./DashboardYieldSummaryCards";
import { DASHBOARD_PAGE_STATS_DIVIDER_CLASS } from "./dashboardStyles";

export type DashboardPageStatsProps = {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
  showArchived: boolean;
  isConnected: boolean;
  totalEarned: number;
  totalOutstanding: number;
};

export function DashboardPageStats({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
  totalEarned,
  totalOutstanding,
}: DashboardPageStatsProps) {
  return (
    <DashboardMetricStrip inline scroll aria-label="Dashboard summary">
      <DashboardPositionSummaryCards
        maidenUsd={maidenUsd}
        earnUsd={earnUsd}
        sailUsd={sailUsd}
        archivedUsd={archivedUsd}
        showArchived={showArchived}
        isConnected={isConnected}
        bare
      />
      <div
        className={DASHBOARD_PAGE_STATS_DIVIDER_CLASS}
        role="separator"
        aria-hidden
      />
      <DashboardYieldSummaryCards
        totalEarned={totalEarned}
        totalOutstanding={totalOutstanding}
        isConnected={isConnected}
        variant="chip"
        bare
      />
    </DashboardMetricStrip>
  );
}
