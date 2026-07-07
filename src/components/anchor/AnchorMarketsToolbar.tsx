"use client";

import {
  INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";
import type { NetworkFilterOption } from "@/utils/networkFilter";
import IndexToolbarNetworkFilter from "@/components/shared/IndexToolbarNetworkFilter";
import IndexToolbarClearFiltersButton from "@/components/shared/IndexToolbarClearFiltersButton";

export type AnchorMarketsToolbarProps = {
  anchorChainOptions: NetworkFilterOption[];
  chainFilterSelected: string[];
  onChainFilterChange: (next: string[]) => void;
  onClearFilters: () => void;
};

/**
 * Network filter row above the Anchor stability-pool table.
 */
export function AnchorMarketsToolbar({
  anchorChainOptions,
  chainFilterSelected,
  onChainFilterChange,
  onClearFilters,
}: AnchorMarketsToolbarProps) {
  const showNetworkFilter =
    anchorChainOptions.length > 1 || chainFilterSelected.length > 0;
  const hasActiveFilters = chainFilterSelected.length > 0;

  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="w-full lg:w-auto lg:min-w-0">
        <div className={INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS}>
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider shrink-0">
          Stability Pools:
        </h2>
        {showNetworkFilter && (
          <>
            <IndexToolbarNetworkFilter
              options={anchorChainOptions}
              value={chainFilterSelected}
              onChange={onChainFilterChange}
              minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
            />
            <IndexToolbarClearFiltersButton
              onClick={onClearFilters}
              visible={hasActiveFilters}
            />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
