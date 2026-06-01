"use client";

import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { DashboardPositionsList } from "./DashboardPositionsList";

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
};

export function DashboardPositionsGrouped({ groups }: DashboardPositionsGroupedProps) {
  return (
    <div className="space-y-5">
      {groups.map((group, index) => (
        <div key={group.id} className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-[#1E4775]/55">
            {group.title}
          </h3>
          {group.error ? (
            <IndexMarksSubgraphErrorBanner error={new Error(group.error)} />
          ) : null}
          <DashboardPositionsList
            rows={group.rows}
            loading={group.loading}
            error={null}
            emptyHint={group.emptyHint}
            showColumnHeader={index === 0}
          />
        </div>
      ))}
    </div>
  );
}
