"use client";

import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { DashboardContentRowSkeleton } from "../DashboardContentRow";
import { DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS } from "../dashboardBrand";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { PORTFOLIO_POSITION_STACK_CLASS } from "./portfolioStyles";
import { YieldSharePositionCard } from "./YieldSharePositionCard";

export type DashboardYieldShareCardListProps = {
  rows: FounderMetricRow[];
  isLoading: boolean;
  error: string | null;
};

export function DashboardYieldShareCardList({
  rows,
  isLoading,
  error,
}: DashboardYieldShareCardListProps) {
  if (error) {
    return <p className="text-sm text-white/70">{error}</p>;
  }

  if (isLoading) {
    return (
      <div className={PORTFOLIO_POSITION_STACK_CLASS}>
        <DashboardContentRowSkeleton variant="index" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        title="Your revenue share starts here"
        message="Join a maiden voyage to earn founding revenue when genesis ends — every distribution counts from day one."
        trustLine="Ownership entitles you to a share of protocol revenue when genesis ends."
        href="/genesis"
        linkLabel="Explore maiden voyages"
        positionCount={0}
        compact
        accentBorderClass={DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS}
      />
    );
  }

  return (
    <div className={PORTFOLIO_POSITION_STACK_CLASS}>
      {rows.map((row) => (
        <YieldSharePositionCard key={row.marketId} row={row} />
      ))}
    </div>
  );
}
