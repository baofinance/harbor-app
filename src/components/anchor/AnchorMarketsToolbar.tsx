"use client";

import type { ReactNode } from "react";
import {
  INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";
import { INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL } from "@/utils/indexPageManageButton";
import IndexToolbarMetricsGroup from "@/components/shared/IndexToolbarMetricsGroup";
import type { NetworkFilterOption } from "@/utils/networkFilter";
import IndexToolbarNetworkFilter from "@/components/shared/IndexToolbarNetworkFilter";
import IndexToolbarClearFiltersButton from "@/components/shared/IndexToolbarClearFiltersButton";

/** Shown in Basic (UI−) layout on the toolbar right — matches toolbar label/value scale. */
export type AnchorBasicClaimToolbarProps = {
  claimableUsdDisplay: string;
  leftMetrics?: Array<{
    label: ReactNode;
    value: string;
  }>;
  onClaim: () => void;
  claimDisabled: boolean;
};

export type AnchorMarketsToolbarProps = {
  anchorChainOptions: NetworkFilterOption[];
  chainFilterSelected: string[];
  onChainFilterChange: (next: string[]) => void;
  onClearFilters: () => void;
  /** Basic (UI−) only: claimable total + Claim (coral) on the toolbar right. */
  basicClaimToolbar?: AnchorBasicClaimToolbarProps;
};

/**
 * Network filter row above the Anchor stability-pool table.
 */
export function AnchorMarketsToolbar({
  anchorChainOptions,
  chainFilterSelected,
  onChainFilterChange,
  onClearFilters,
  basicClaimToolbar,
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
      {basicClaimToolbar ? (
        <div className="w-full lg:ml-auto lg:w-auto lg:min-w-0 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <div className="w-full lg:w-auto">
            <IndexToolbarMetricsGroup
              metrics={[
                ...(basicClaimToolbar.leftMetrics ?? []),
                {
                  label: "Claimable value",
                  value: `$${basicClaimToolbar.claimableUsdDisplay}`,
                },
              ]}
              action={
                <button
                  type="button"
                  onClick={basicClaimToolbar.onClaim}
                  disabled={basicClaimToolbar.claimDisabled}
                  className={INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL}
                >
                  Claim
                </button>
              }
              className="w-full lg:w-auto"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
