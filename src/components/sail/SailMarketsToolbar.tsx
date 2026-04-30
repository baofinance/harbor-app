"use client";

import type { Dispatch, SetStateAction } from "react";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import { getLogoPath } from "@/components/shared";
import IndexToolbarMetricsGroup, {
  type IndexToolbarMetric,
} from "@/components/shared/IndexToolbarMetricsGroup";
import { INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import type { NetworkFilterOption } from "@/utils/networkFilter";
import IndexToolbarNetworkFilter from "@/components/shared/IndexToolbarNetworkFilter";
import IndexToolbarClearFiltersButton from "@/components/shared/IndexToolbarClearFiltersButton";

export type SailMarketsToolbarProps = {
  sailChainOptions: NetworkFilterOption[];
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
  metrics?: IndexToolbarMetric[];
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
  metrics,
}: SailMarketsToolbarProps) {
  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Leverage Position:
        </h2>
        {showNetworkFilter && (
          <IndexToolbarNetworkFilter
            options={sailChainOptions}
            value={chainFilterSelected}
            onChange={setChainFilterSelected}
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
        {(chainFilterSelected.length > 0 ||
          longFilterSelected.length > 0 ||
          shortFilterSelected.length > 0) && (
          <IndexToolbarClearFiltersButton onClick={onClearFilters} />
        )}
      </div>
      <div className="w-full md:flex-1 md:min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-3">
        <div className="hidden md:block" />
        {metrics && metrics.length > 0 ? (
          <div className="md:justify-self-center">
            <IndexToolbarMetricsGroup metrics={metrics} />
          </div>
        ) : (
          <div />
        )}
        <LedgerMarksCompactBadge
          centerOnMobile
          className="w-full md:w-auto md:justify-self-end"
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
    </div>
  );
}
