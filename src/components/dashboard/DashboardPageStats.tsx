"use client";

import type { ReactNode } from "react";
import { DashboardPositionSummaryCards } from "./DashboardPositionSummaryCards";
import { DashboardYieldSummaryCards } from "./DashboardYieldSummaryCards";
import {
  DASHBOARD_PAGE_STATS_CLASS,
  DASHBOARD_PAGE_STATS_GROUP_CLASS,
  DASHBOARD_PAGE_STATS_GROUP_LABEL_CLASS,
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

function StatsGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className={DASHBOARD_PAGE_STATS_GROUP_CLASS} aria-label={label}>
      <h2 className={DASHBOARD_PAGE_STATS_GROUP_LABEL_CLASS}>{label}</h2>
      {children}
    </section>
  );
}

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
    <div className={DASHBOARD_PAGE_STATS_CLASS}>
      <StatsGroup label="Positions">
        <DashboardPositionSummaryCards
          maidenUsd={maidenUsd}
          earnUsd={earnUsd}
          sailUsd={sailUsd}
          archivedUsd={archivedUsd}
          showArchived={showArchived}
          isConnected={isConnected}
        />
      </StatsGroup>
      <StatsGroup label="Yield share">
        <DashboardYieldSummaryCards
          totalEarned={totalEarned}
          totalOutstanding={totalOutstanding}
          isConnected={isConnected}
          variant="chip"
          scroll
        />
      </StatsGroup>
    </div>
  );
}
