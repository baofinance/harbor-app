"use client";

import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { DashboardContentRowSkeleton } from "../DashboardContentRow";
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
        {[0, 1].map((i) => (
          <DashboardContentRowSkeleton key={i} variant="index" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        title="No yield share yet"
        message="Participate in a maiden voyage to earn founding revenue share after genesis ends."
        href="/genesis"
        linkLabel="Explore maiden voyages"
        positionCount={0}
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
