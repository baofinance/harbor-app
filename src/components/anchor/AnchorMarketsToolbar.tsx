"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import { INDEX_MARKETS_TOOLBAR_ROW_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import { INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL } from "@/utils/indexPageManageButton";

/** Shown in Basic (UI−) layout between filters and Ledger Marks — matches toolbar label/value scale. */
export type AnchorBasicClaimToolbarProps = {
  claimableUsdDisplay: string;
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
    <div className={INDEX_MARKETS_TOOLBAR_ROW_CLASS}>
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
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3 min-w-0">
        {basicClaimToolbar ? (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider leading-tight">
                Claimable value
              </span>
              <span className="text-sm font-semibold text-white font-mono tabular-nums mt-0.5">
                ${basicClaimToolbar.claimableUsdDisplay}
              </span>
            </div>
            <button
              type="button"
              onClick={basicClaimToolbar.onClaim}
              disabled={basicClaimToolbar.claimDisabled}
              className={INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL}
            >
              Claim
            </button>
          </div>
        ) : null}
        <LedgerMarksCompactBadge
          className="shrink-0"
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
