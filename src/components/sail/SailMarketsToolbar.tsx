"use client";

import type { Dispatch, SetStateAction } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import SimpleTooltip from "@/components/SimpleTooltip";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import { getLogoPath } from "@/components/shared";
import { INDEX_MARKETS_TOOLBAR_ROW_CLASS } from "@/components/shared/indexMarketsToolbarStyles";

export type SailMarketsToolbarProps = {
  sailChainOptions: Array<{
    id: string;
    label: string;
    iconUrl?: string;
    networkId?: string;
  }>;
  /** When false, Network dropdown is hidden (single-chain). */
  showNetworkFilter: boolean;
  chainFilterSelected: string[];
  setChainFilterSelected: Dispatch<SetStateAction<string[]>>;
  uniqueLongSides: string[];
  uniqueShortSides: string[];
  longFilterSelected: string[];
  setLongFilterSelected: Dispatch<SetStateAction<string[]>>;
  shortFilterSelected: string[];
  setShortFilterSelected: Dispatch<SetStateAction<string[]>>;
  onClearFilters: () => void;
};

/**
 * Filters + Ledger Marks badge row above the Sail markets table.
 */
export function SailMarketsToolbar({
  sailChainOptions,
  showNetworkFilter,
  chainFilterSelected,
  setChainFilterSelected,
  uniqueLongSides,
  uniqueShortSides,
  longFilterSelected,
  setLongFilterSelected,
  shortFilterSelected,
  setShortFilterSelected,
  onClearFilters,
}: SailMarketsToolbarProps) {
  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_CLASS}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Leverage Position:
        </h2>
        {showNetworkFilter && (
          <FilterMultiselectDropdown
            label="Network"
            options={sailChainOptions}
            value={chainFilterSelected}
            onChange={setChainFilterSelected}
            allLabel="All networks"
            groupLabel="NETWORKS"
            minWidthClass="min-w-[235px]"
          />
        )}
        <FilterMultiselectDropdown
          label="Long"
          options={uniqueLongSides.map((side) => ({
            id: side,
            label: `Long ${side}`,
            iconUrl: getLogoPath(side),
            prefix: "long" as const,
          }))}
          value={longFilterSelected}
          onChange={setLongFilterSelected}
          allLabel="All Long"
          groupLabel="LONG"
          minWidthClass="min-w-[235px]"
        />
        <FilterMultiselectDropdown
          label="Short"
          options={uniqueShortSides.map((side) => ({
            id: side,
            label: `Short ${side}`,
            iconUrl: getLogoPath(side),
            prefix: "short" as const,
          }))}
          value={shortFilterSelected}
          onChange={setShortFilterSelected}
          allLabel="All Short"
          groupLabel="SHORT"
          minWidthClass="min-w-[235px]"
        />
        <SimpleTooltip label="clear filters">
          <button
            type="button"
            onClick={onClearFilters}
            className="p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors"
            aria-label="clear filters"
          >
            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
          </button>
        </SimpleTooltip>
      </div>
      <LedgerMarksCompactBadge
        centerOnMobile
        className="w-full md:w-auto md:ml-auto"
        pillClassName="w-full md:w-auto justify-center md:justify-start"
        body={
          <>
            <div className="font-semibold">Ledger Marks</div>
            <div>
              Earned by holding sail tokens. Used to qualify for future
              rewards.
            </div>
          </>
        }
        earnSummary={
          <>
            <span className="font-semibold text-white">
              All positions earn Ledger Marks
            </span>{" "}
            <span className="text-white/80">• 10 / $ / day</span>
          </>
        }
      />
    </div>
  );
}
