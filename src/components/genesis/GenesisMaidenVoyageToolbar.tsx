"use client";

import IndexToolbarSegmentedToggle from "@/components/shared/IndexToolbarSegmentedToggle";
import {
  INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

export const MAIDEN_VOYAGE_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "ongoing", label: "Ongoing" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
] as const;

export type MaidenVoyageStatusFilter =
  (typeof MAIDEN_VOYAGE_STATUS_OPTIONS)[number]["id"];

export type GenesisMaidenVoyageToolbarProps = {
  statusFilter: MaidenVoyageStatusFilter;
  onStatusFilterChange: (id: MaidenVoyageStatusFilter) => void;
  archivedCount: number;
  showArchivedLink: boolean;
  onViewArchived: () => void;
};

/**
 * Status Voyages filter row above the explorer table (Anchor/Sail toolbar pattern).
 */
export function GenesisMaidenVoyageToolbar({
  statusFilter,
  onStatusFilterChange,
  archivedCount,
  showArchivedLink,
  onViewArchived,
}: GenesisMaidenVoyageToolbarProps) {
  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="w-full lg:w-auto lg:min-w-0">
        <div className={INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS}>
          <IndexToolbarSegmentedToggle
            label="Status Voyages:"
            value={statusFilter}
            onChange={(id) =>
              onStatusFilterChange(id as MaidenVoyageStatusFilter)
            }
            options={[...MAIDEN_VOYAGE_STATUS_OPTIONS]}
            ariaLabel="Status voyages"
          />
        </div>
      </div>
      {showArchivedLink ? (
        <div className="flex w-full items-center justify-end lg:ml-auto lg:w-auto lg:min-w-0">
          <button
            type="button"
            onClick={onViewArchived}
            className="shrink-0 text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
          >
            View archived ({archivedCount})
          </button>
        </div>
      ) : null}
    </div>
  );
}
