"use client";

import type { Dispatch, SetStateAction } from "react";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import {
  getSailSideLogoPath,
  isSailPegAssetSide,
  SAIL_PEG_ICON_TABLE_PX,
  SAIL_TABLE_SIDE_ICON_PX,
} from "@/utils/sailAssetLogos";
import IndexToolbarMetricsGroup, {
  type IndexToolbarMetric,
} from "@/components/shared/IndexToolbarMetricsGroup";
import {
  INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";
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
  const hasActiveFilters =
    chainFilterSelected.length > 0 ||
    longFilterSelected.length > 0 ||
    shortFilterSelected.length > 0;

  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="w-full lg:w-auto lg:min-w-0">
        <div className={INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS}>
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Leverage Position:
        </h2>
        {showNetworkFilter && (
          <IndexToolbarNetworkFilter
            options={sailChainOptions}
            value={chainFilterSelected}
            onChange={setChainFilterSelected}
            minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
          />
        )}
        <FilterMultiselectDropdown
          label="Long"
          options={uniqueLongSides.map((side) => ({
            id: side,
            label: `Long ${side}`,
            iconUrl: getSailSideLogoPath(side),
            iconSizePx: isSailPegAssetSide(side)
              ? SAIL_PEG_ICON_TABLE_PX
              : SAIL_TABLE_SIDE_ICON_PX,
            prefix: "long" as const,
          }))}
          value={longFilterSelected}
          onChange={setLongFilterSelected}
          allLabel="All Long"
          groupLabel="LONG"
          minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
        />
        <FilterMultiselectDropdown
          label="Short"
          options={uniqueShortSides.map((side) => ({
            id: side,
            label: `Short ${side}`,
            iconUrl: getSailSideLogoPath(side),
            iconSizePx: isSailPegAssetSide(side)
              ? SAIL_PEG_ICON_TABLE_PX
              : SAIL_TABLE_SIDE_ICON_PX,
            prefix: "short" as const,
          }))}
          value={shortFilterSelected}
          onChange={setShortFilterSelected}
          allLabel="All Short"
          groupLabel="SHORT"
          minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
        />
        <IndexToolbarClearFiltersButton
          onClick={onClearFilters}
          visible={hasActiveFilters}
        />
        </div>
      </div>
      <div className="w-full lg:ml-auto lg:w-auto lg:min-w-0 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
        {metrics && metrics.length > 0 ? (
          <div className="w-full lg:w-auto">
            <IndexToolbarMetricsGroup metrics={metrics} className="w-full lg:w-auto" />
          </div>
        ) : null}
        <LedgerMarksCompactBadge
          centerOnMobile
          className="w-full lg:w-auto"
          pillClassName="w-full lg:w-auto min-h-[52px] px-3 py-1.5 justify-center lg:justify-start"
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
