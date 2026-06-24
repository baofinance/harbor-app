"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { DashboardContentRowSkeleton } from "../DashboardContentRow";
import { DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS } from "../dashboardBrand";
import { DASHBOARD_YIELD_METRICS_STACK_CLASS } from "./portfolioStyles";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { YieldSharePositionCard } from "./YieldSharePositionCard";

const VISIBLE_MARKET_LIMIT = 4;

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
  const [expanded, setExpanded] = useState(false);

  if (error) {
    return <p className="text-sm text-white/70">{error}</p>;
  }

  if (isLoading) {
    return (
      <div className={DASHBOARD_YIELD_METRICS_STACK_CLASS}>
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

  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_MARKET_LIMIT);
  const hiddenCount = rows.length - VISIBLE_MARKET_LIMIT;

  return (
    <div>
      <div className={DASHBOARD_YIELD_METRICS_STACK_CLASS}>
        {visibleRows.map((row) => (
          <YieldSharePositionCard key={row.marketId} row={row} />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-1 flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-2.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.03] hover:text-white/75"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer markets" : `+${hiddenCount} more markets`}
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
