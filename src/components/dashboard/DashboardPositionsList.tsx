"use client";

import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { DashboardArchivedWithdrawNotice } from "./DashboardArchivedWithdrawNotice";
import { DashboardContentRowSkeleton } from "./DashboardContentRow";
import { DashboardEmptyState } from "./portfolio/DashboardEmptyState";
import { PositionCard } from "./portfolio/PositionCard";
import {
  DASHBOARD_ARCHIVED_POSITION_METRICS_STACK_CLASS,
  DASHBOARD_EARN_POSITION_METRICS_STACK_CLASS,
  DASHBOARD_POSITION_METRICS_STACK_CLASS,
  DASHBOARD_SAIL_POSITION_METRICS_STACK_CLASS,
} from "./portfolio/portfolioStyles";

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
  loadingSkeletonCount?: number;
  onManage?: (row: DashboardPositionRow) => void;
  showWithdrawNotice?: boolean;
  /** Sail positions — show dedicated PnL column before position value. */
  showPnLColumn?: boolean;
  /** Earn positions — show APR column before balance. */
  showAprColumn?: boolean;
};

export function DashboardPositionsList({
  rows,
  loading,
  error,
  emptyState,
  emptyHint,
  loadingSkeletonCount = 3,
  onManage,
  showWithdrawNotice = false,
  showPnLColumn = false,
  showAprColumn = false,
}: DashboardPositionsListProps) {
  const stackClass = onManage
    ? DASHBOARD_ARCHIVED_POSITION_METRICS_STACK_CLASS
    : showPnLColumn
      ? DASHBOARD_SAIL_POSITION_METRICS_STACK_CLASS
      : showAprColumn
        ? DASHBOARD_EARN_POSITION_METRICS_STACK_CLASS
        : DASHBOARD_POSITION_METRICS_STACK_CLASS;

  if (error) {
    return <p className="text-sm text-white/70">{error}</p>;
  }

  if (loading) {
    return (
      <div className={stackClass}>
        {Array.from({ length: loadingSkeletonCount }, (_, i) => (
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
          compact
        />
      );
    }
    return <p className="text-sm text-white/70">{emptyHint}</p>;
  }

  return (
    <div className="space-y-2">
      {showWithdrawNotice ? <DashboardArchivedWithdrawNotice /> : null}
      <div className={stackClass}>
        {rows.map((row) => (
          <PositionCard
            key={row.id}
            row={row}
            onWithdraw={onManage}
            showPnLColumn={showPnLColumn}
            showAprColumn={showAprColumn}
          />
        ))}
      </div>
    </div>
  );
}
