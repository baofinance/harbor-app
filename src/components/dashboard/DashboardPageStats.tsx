"use client";

import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import { DashboardPositionSummaryCards } from "./DashboardPositionSummaryCards";
import { DashboardYieldSummaryCards } from "./DashboardYieldSummaryCards";
import {
  DASHBOARD_PAGE_STATS_DIVIDER_CLASS,
  DASHBOARD_PAGE_STATS_GROUP_CLASS,
  DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS,
  DASHBOARD_PAGE_STATS_YIELD_CHIPS_CLASS,
} from "./dashboardStyles";

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
      <div
        className={DASHBOARD_PAGE_STATS_GROUP_CLASS}
        role="group"
        aria-labelledby="dashboard-stats-positions-label"
      >
        <p
          id="dashboard-stats-positions-label"
          className="sr-only"
        >
          Positions
        </p>
        <div className={DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS}>
          <DashboardPositionSummaryCards
            maidenUsd={maidenUsd}
            earnUsd={earnUsd}
            sailUsd={sailUsd}
            archivedUsd={archivedUsd}
            showArchived={showArchived}
            isConnected={isConnected}
            bare
          />
        </div>
      </div>
      <div
        className={DASHBOARD_PAGE_STATS_DIVIDER_CLASS}
        role="separator"
        aria-hidden
      />
      <div
        className={DASHBOARD_PAGE_STATS_GROUP_CLASS}
        role="group"
        aria-labelledby="dashboard-stats-yield-label"
      >
        <p
          id="dashboard-stats-yield-label"
          className="sr-only"
        >
          Yield share
        </p>
        <div className={DASHBOARD_PAGE_STATS_YIELD_CHIPS_CLASS}>
          <DashboardYieldSummaryCards
            totalEarned={totalEarned}
            totalOutstanding={totalOutstanding}
            isConnected={isConnected}
            variant="chip"
            bare
          />
        </div>
      </div>
    </DashboardMetricStrip>
  );
}
