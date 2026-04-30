"use client";

/**
 * Filter / controls row: active campaign pill, Genesis Ongoing/All, network filter, Ledger Marks badge.
 * @see docs/routes/genesis.md
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import SimpleTooltip from "@/components/SimpleTooltip";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import IndexToolbarSegmentedToggle from "@/components/shared/IndexToolbarSegmentedToggle";
import IndexToolbarMetricsGroup, {
  type IndexToolbarMetric,
} from "@/components/shared/IndexToolbarMetricsGroup";
import {
  INDEX_CORAL_INFO_TAG_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

export type GenesisMarketsToolbarProps = {
  activeCampaignName: string | null;
  displayedCompletedByCampaignSize: number;
  genesisChainOptions: Array<{
    id: string;
    label: string;
    iconUrl?: string;
    networkId?: string;
  }>;
  chainFilterSelected: string[];
  setChainFilterSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setShowCompletedGenesis: (value: boolean) => void;
  showCompletedGenesis: boolean;
  metrics?: IndexToolbarMetric[];
};

export function GenesisMarketsToolbar({
  activeCampaignName,
  displayedCompletedByCampaignSize,
  genesisChainOptions,
  chainFilterSelected,
  setChainFilterSelected,
  setShowCompletedGenesis,
  showCompletedGenesis,
  metrics,
}: GenesisMarketsToolbarProps) {
  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            Active Campaign:
            {activeCampaignName && (
              <span className={INDEX_CORAL_INFO_TAG_CLASS}>{activeCampaignName}</span>
            )}
            {activeCampaignName ? (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-tight border border-white/40 bg-white/10 text-white">
                2.0
              </span>
            ) : null}
          </span>
        </h2>
        {displayedCompletedByCampaignSize > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              Genesis:
            </span>
            {genesisChainOptions.length > 1 && (
              <FilterMultiselectDropdown
                label="Network"
                options={genesisChainOptions}
                value={chainFilterSelected}
                onChange={setChainFilterSelected}
                allLabel="All networks"
                groupLabel="NETWORKS"
                minWidthClass="min-w-[235px]"
              />
            )}
            <IndexToolbarSegmentedToggle
              label="Status:"
              value={showCompletedGenesis ? "all" : "ongoing"}
              onChange={(id) => setShowCompletedGenesis(id === "all")}
              options={[
                { id: "ongoing", label: "Ongoing" },
                { id: "all", label: "All" },
              ]}
              ariaLabel="Genesis status"
            />
            {chainFilterSelected.length > 0 && (
              <SimpleTooltip label="clear filters">
                <button
                  type="button"
                  onClick={() => setChainFilterSelected([])}
                  className="p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors"
                  aria-label="clear filters"
                >
                  <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                </button>
              </SimpleTooltip>
            )}
          </div>
        )}
        {displayedCompletedByCampaignSize === 0 && genesisChainOptions.length > 1 && (
          <>
            <FilterMultiselectDropdown
              label="Network"
              options={genesisChainOptions}
              value={chainFilterSelected}
              onChange={setChainFilterSelected}
              allLabel="All networks"
              groupLabel="NETWORKS"
              minWidthClass="min-w-[235px]"
            />
            {chainFilterSelected.length > 0 && (
              <SimpleTooltip label="clear filters">
                <button
                  type="button"
                  onClick={() => setChainFilterSelected([])}
                  className="p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors"
                  aria-label="clear filters"
                >
                  <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                </button>
              </SimpleTooltip>
            )}
          </>
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
          className="max-w-full md:justify-self-end"
          pillClassName="text-xs sm:text-sm max-w-full"
          tooltipMaxWidth="min(90vw, 22rem)"
          intro={
            <p>
              Active genesis campaigns use the mark rates below. USD caps set
              pool ownership; bonuses depend on the campaign you joined.
            </p>
          }
          body={
            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <div className="font-semibold text-white text-sm mb-1">
                  Ledger Marks
                </div>
                <p className="text-white/90">
                  <span className="font-semibold text-white">Earn 10</span>{" "}
                  Ledger Marks per{" "}
                  <span className="font-semibold text-white">$</span> deposited
                  per day, plus{" "}
                  <span className="font-semibold text-white">100</span> bonus
                  marks at genesis close (where the campaign offers it).
                </p>
              </div>
              <div className="border-t border-white/20 pt-2">
                <p className="text-white/90">
                  <span className="font-semibold text-white">
                    Early Deposit Bonus!
                  </span>{" "}
                  Eligible early deposits can earn extra marks—for example{" "}
                  <span className="font-semibold text-white">100</span> marks
                  per{" "}
                  <span className="font-semibold text-white">$</span> during the
                  bonus window, when your market&apos;s campaign includes it.
                </p>
              </div>
            </div>
          }
          earnSummary={
            <>
              <span className="font-semibold text-white">
                Maiden voyage 2.0: 10 marks / $ / day
              </span>
              <span className="text-white/80">
                {" "}
                • +100 marks bonus on completion • early-deposit bonus where
                shown
              </span>
            </>
          }
        />
      </div>
    </div>
  );
}
