"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { formatUSD } from "@/utils/formatters";
import {
  DASHBOARD_GROUP_HEADER_CLASS,
  DASHBOARD_GROUP_TITLE_CLASS,
  DASHBOARD_SECTION_ACTION_BTN_CLASS,
  DASHBOARD_SECTION_CHEVRON_CLASS,
} from "./dashboardStyles";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import type { DashboardPositionGroup } from "./DashboardPositionsGrouped";
import { DashboardPositionsList } from "./DashboardPositionsList";

export type DashboardPositionGroupSectionProps = {
  group: DashboardPositionGroup;
  onManage?: (row: DashboardPositionRow) => void;
  /** Start expanded when the group has rows or is still loading. */
  defaultExpanded?: boolean;
};

export function DashboardPositionGroupSection({
  group,
  onManage,
  defaultExpanded = true,
}: DashboardPositionGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const totalUsd = useMemo(
    () => group.rows.reduce((sum, row) => sum + row.usd, 0),
    [group.rows]
  );

  const showTotal = !group.loading && group.rows.length > 0;

  return (
    <div className="space-y-2">
      <div className={DASHBOARD_GROUP_HEADER_CLASS}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <h3 className={DASHBOARD_GROUP_TITLE_CLASS}>{group.title}</h3>
          {showTotal ? (
            <span className="shrink-0 font-mono text-sm tabular-nums text-white/60">
              {formatUSD(totalUsd, { compact: false })}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={DASHBOARD_SECTION_ACTION_BTN_CLASS}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${group.title}` : `Expand ${group.title}`}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronUpIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
          ) : (
            <ChevronDownIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="space-y-2">
          {group.error ? (
            <IndexMarksSubgraphErrorBanner error={new Error(group.error)} />
          ) : null}
          <DashboardPositionsList
            rows={group.rows}
            loading={group.loading}
            error={null}
            emptyHint={group.emptyHint}
            showColumnHeader
            onManage={onManage}
          />
        </div>
      ) : null}
    </div>
  );
}
