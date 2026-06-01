"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { INDEX_MANAGE_BUTTON_CLASS_COMPACT } from "@/utils/indexPageManageButton";
import { formatUSD } from "@/utils/formatters";
import { DashboardStatusPill } from "./DashboardStatusPill";
import {
  DASHBOARD_EMPTY_ON_PANEL_CLASS,
  DASHBOARD_PANEL_ROW_SHELL_CLASS,
  DASHBOARD_POSITIONS_HEADER_GRID_CLASS,
  DASHBOARD_POSITIONS_LIST_CLASS,
  DASHBOARD_POSITIONS_ROW_GRID_CLASS,
  DASHBOARD_SKELETON_BAR_CLASS,
  DASHBOARD_TABLE_HEADER_WRAP_CLASS,
} from "./dashboardRowListStyles";

function PositionsListHeader() {
  return (
    <div className={DASHBOARD_TABLE_HEADER_WRAP_CLASS}>
      <div className={DASHBOARD_POSITIONS_HEADER_GRID_CLASS}>
        <div className="min-w-0 truncate">Market</div>
        <div className="min-w-0 truncate">Type</div>
        <div className="min-w-0 truncate text-right">Notional</div>
        <div className="min-w-0 text-right">Actions</div>
      </div>
    </div>
  );
}

function PositionRowSkeleton() {
  return (
    <div className={DASHBOARD_PANEL_ROW_SHELL_CLASS}>
      <div className={DASHBOARD_SKELETON_BAR_CLASS} />
    </div>
  );
}

function DashboardPositionRow({ row }: { row: DashboardPositionRow }) {
  return (
    <div className={DASHBOARD_PANEL_ROW_SHELL_CLASS}>
      <div className={`${DASHBOARD_POSITIONS_ROW_GRID_CLASS} px-1`}>
        <div className="flex min-w-0 items-center gap-2">
          <TokenLogo symbol={row.iconSymbol} size={24} className="shrink-0 ring-0" />
          <span className="truncate font-medium text-[#1E4775]">{row.marketLabel}</span>
        </div>
        <div className="min-w-0">
          <DashboardStatusPill label={row.statusLabel} tone={row.statusTone} />
        </div>
        <div className="min-w-0 text-right tabular-nums font-medium text-[#1E4775]">
          {formatUSD(row.usd, { compact: false })}
        </div>
        <div className="flex justify-end">
          <Link href={row.href} className={INDEX_MANAGE_BUTTON_CLASS_COMPACT}>
            Manage
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-1 py-1 md:hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TokenLogo symbol={row.iconSymbol} size={24} className="shrink-0 ring-0" />
            <span className="truncate font-medium text-[#1E4775]">{row.marketLabel}</span>
          </div>
          <DashboardStatusPill label={row.statusLabel} tone={row.statusTone} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-[#1E4775]/60">Notional</span>
          <span className="tabular-nums font-medium text-[#1E4775]">
            {formatUSD(row.usd, { compact: false })}
          </span>
        </div>
        <div className="flex justify-end">
          <Link href={row.href} className={INDEX_MANAGE_BUTTON_CLASS_COMPACT}>
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}

export type DashboardPositionsListProps = {
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyHint: ReactNode;
  /** Show Market/Type/Notional header once above the first product group. */
  showColumnHeader?: boolean;
};

export function DashboardPositionsList({
  rows,
  loading,
  error,
  emptyHint,
  showColumnHeader = true,
}: DashboardPositionsListProps) {
  if (error) {
    return <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>{error}</p>;
  }

  if (loading) {
    return (
      <div className={DASHBOARD_POSITIONS_LIST_CLASS}>
        {showColumnHeader ? <PositionsListHeader /> : null}
        {[0, 1, 2].map((i) => (
          <PositionRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>{emptyHint}</p>;
  }

  return (
    <div className={DASHBOARD_POSITIONS_LIST_CLASS}>
      {showColumnHeader ? <PositionsListHeader /> : null}
      {rows.map((row) => (
        <DashboardPositionRow key={row.id} row={row} />
      ))}
    </div>
  );
}
