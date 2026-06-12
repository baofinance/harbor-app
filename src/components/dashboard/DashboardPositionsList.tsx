"use client";

import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { DashboardContentRowSkeleton } from "./DashboardContentRow";
import { DashboardMarketColumnHeader } from "./DashboardMarketColumnHeader";
import { DashboardPositionRowView } from "./DashboardPositionRowView";
import {
  DASHBOARD_EMPTY_ON_PANEL_CLASS,
  DASHBOARD_POSITIONS_COL_ACTION_CLASSNAME,
  DASHBOARD_POSITIONS_ACTION_FOOTPRINT_CLASSNAME,
  DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME,
  DASHBOARD_POSITIONS_COL_NOTIONAL_CLASSNAME,
  DASHBOARD_POSITIONS_COL_TYPE_CLASSNAME,
  DASHBOARD_POSITIONS_LIST_CLASS,
  DASHBOARD_INDEX_TABLE_HEADER_WRAP_CLASS,
  DASHBOARD_POSITIONS_TABLE_HEADER_GRID_CLASSNAME,
  DASHBOARD_POSITIONS_TABLE_MIN_WIDTH_CLASSNAME,
  DASHBOARD_POSITIONS_TABLE_SCROLL_WRAP_CLASSNAME,
} from "./dashboardRowListStyles";

function PositionsListHeader() {
  return (
    <div className={DASHBOARD_INDEX_TABLE_HEADER_WRAP_CLASS}>
      <div className={DASHBOARD_POSITIONS_TABLE_HEADER_GRID_CLASSNAME}>
        <div className={DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME} aria-label="Network" />
        <DashboardMarketColumnHeader />
        <div className={DASHBOARD_POSITIONS_COL_TYPE_CLASSNAME}>Type</div>
        <div className={DASHBOARD_POSITIONS_COL_NOTIONAL_CLASSNAME}>Deposit</div>
        <div className={DASHBOARD_POSITIONS_COL_ACTION_CLASSNAME}>
          <span className={DASHBOARD_POSITIONS_ACTION_FOOTPRINT_CLASSNAME}>Action</span>
        </div>
      </div>
    </div>
  );
}

function PositionsTable({
  showColumnHeader,
  children,
}: {
  showColumnHeader: boolean;
  children: ReactNode;
}) {
  return (
    <div className={DASHBOARD_POSITIONS_TABLE_SCROLL_WRAP_CLASSNAME}>
      <div className={`${DASHBOARD_POSITIONS_TABLE_MIN_WIDTH_CLASSNAME} space-y-2`}>
        {showColumnHeader ? <PositionsListHeader /> : null}
        {children}
      </div>
    </div>
  );
}

export type DashboardPositionsListProps = {
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyHint: ReactNode;
  /** Show Market/Type/Deposit header once above the first product group. */
  showColumnHeader?: boolean;
  onManage?: (row: DashboardPositionRow) => void;
};

export function DashboardPositionsList({
  rows,
  loading,
  error,
  emptyHint,
  showColumnHeader = true,
  onManage,
}: DashboardPositionsListProps) {
  if (error) {
    return <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>{error}</p>;
  }

  if (loading) {
    return (
      <div className={DASHBOARD_POSITIONS_LIST_CLASS}>
        <PositionsTable showColumnHeader={showColumnHeader}>
          {[0, 1, 2].map((i) => (
            <DashboardContentRowSkeleton key={i} variant="index" />
          ))}
        </PositionsTable>
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>{emptyHint}</p>;
  }

  return (
    <div className={DASHBOARD_POSITIONS_LIST_CLASS}>
      <PositionsTable showColumnHeader={showColumnHeader}>
        {rows.map((row) => (
          <DashboardPositionRowView key={row.id} row={row} onManage={onManage} />
        ))}
      </PositionsTable>
    </div>
  );
}
