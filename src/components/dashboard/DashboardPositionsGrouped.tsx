"use client";

import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { DashboardPositionGroupSection } from "./DashboardPositionGroupSection";

export type DashboardPositionGroup = {
  id: string;
  title: string;
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyHint: ReactNode;
};

export type DashboardPositionsGroupedProps = {
  groups: DashboardPositionGroup[];
  onManage?: (row: DashboardPositionRow) => void;
  /** UI (basic): keep Maiden Voyage / Earn / Sail headers collapsed. */
  compactGroups?: boolean;
};

export function DashboardPositionsGrouped({
  groups,
  onManage,
  compactGroups = false,
}: DashboardPositionsGroupedProps) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <DashboardPositionGroupSection
          key={group.id}
          group={group}
          onManage={onManage}
          defaultExpanded={
            compactGroups ? false : group.rows.length > 0 || group.loading
          }
        />
      ))}
    </div>
  );
}
