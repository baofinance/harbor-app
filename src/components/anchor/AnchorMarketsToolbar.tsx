"use client";

import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import { INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import { INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL } from "@/utils/indexPageManageButton";
import IndexToolbarMetricsGroup from "@/components/shared/IndexToolbarMetricsGroup";

/** Shown in Basic (UI−) layout between filters and Ledger Marks — matches toolbar label/value scale. */
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
  anchorChainOptions: Array<{
    id: string;
    label: string;
    iconUrl?: string;
    networkId?: string;
  }>;
  chainFilterSelected: string[];
  onChainFilterChange: (next: string[]) => void;
  onClearFilters: () => void;
  /** Basic (UI−) only: claimable total + Claim (coral), between clear (X) and Ledger Marks. */
  basicClaimToolbar?: AnchorBasicClaimToolbarProps;
};

/**
 * Network filter + Ledger Marks strip above the Anchor stability-pool table.
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

  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Stability Pools:
        </h2>
        {showNetworkFilter && (
          <>
            <FilterMultiselectDropdown
              label="Network"
              options={anchorChainOptions}
              value={chainFilterSelected}
              onChange={onChainFilterChange}
              allLabel="All networks"
              groupLabel="NETWORKS"
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
          </>
        )}
      </div>
      <div className="w-full md:flex-1 md:min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-3">
        <div className="hidden md:block" />
        {basicClaimToolbar ? (
          <div className="md:justify-self-center">
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
            />
          </div>
        ) : (
          <div />
        )}
        <LedgerMarksCompactBadge
          className="md:justify-self-end shrink-0"
          body={
            <>
              <div className="font-semibold">Ledger Marks</div>
              <div>
                Earned by holding anchor tokens and depositing into stability
                pools. Used to qualify for future rewards.
              </div>
            </>
          }
          earnSummary={
            <>
              <span className="font-semibold text-white">
                All positions earn Ledger Marks
              </span>{" "}
              <span className="text-white/80">• 1 / $ / day</span>
            </>
          }
        />
      </div>
    </div>
  );
}
