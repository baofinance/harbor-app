"use client";

import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { DashboardContentRowSkeleton } from "./DashboardContentRow";
import { DashboardEmptyState } from "./portfolio/DashboardEmptyState";
import { PositionCard } from "./portfolio/PositionCard";
import { PORTFOLIO_POSITION_STACK_CLASS } from "./portfolio/portfolioStyles";

export type DashboardEmptyStateConfig = {
  title: string;
  message: string;
  href: string;
  linkLabel: string;
};

export type DashboardPositionsListProps = {
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyState?: DashboardEmptyStateConfig;
  /** @deprecated Use emptyState */
  emptyHint?: ReactNode;
  onManage?: (row: DashboardPositionRow) => void;
};

export function DashboardPositionsList({
  rows,
  loading,
  error,
  emptyState,
  emptyHint,
  onManage,
}: DashboardPositionsListProps) {
  if (error) {
    return <p className="text-sm text-white/70">{error}</p>;
  }

  if (loading) {
    return (
      <div className={PORTFOLIO_POSITION_STACK_CLASS}>
        {[0, 1, 2].map((i) => (
          <DashboardContentRowSkeleton key={i} variant="index" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    if (emptyState) {
      return (
        <DashboardEmptyState
          title={emptyState.title}
          message={emptyState.message}
          href={emptyState.href}
          linkLabel={emptyState.linkLabel}
          positionCount={0}
        />
      );
    }
    return <p className="text-sm text-white/70">{emptyHint}</p>;
  }

  return (
    <div className={PORTFOLIO_POSITION_STACK_CLASS}>
      {rows.map((row) => (
        <PositionCard key={row.id} row={row} onManage={onManage} />
      ))}
    </div>
  );
}
