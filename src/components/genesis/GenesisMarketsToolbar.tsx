"use client";

/**
 * Filter / controls row: active campaign pill, Genesis Ongoing/All, network filter, Ledger Marks badge.
 * @see docs/routes/genesis.md
 */
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import IndexToolbarSegmentedToggle from "@/components/shared/IndexToolbarSegmentedToggle";
import IndexToolbarNetworkFilter from "@/components/shared/IndexToolbarNetworkFilter";
import IndexToolbarClearFiltersButton from "@/components/shared/IndexToolbarClearFiltersButton";
import IndexToolbarMetricsGroup, {
  type IndexToolbarMetric,
} from "@/components/shared/IndexToolbarMetricsGroup";
import type { NetworkFilterOption } from "@/utils/networkFilter";
import {
  INDEX_CORAL_INFO_TAG_CLASS,
  INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

export type GenesisMarketsToolbarProps = {
  activeCampaignNames: string[];
  displayedCompletedByCampaignSize: number;
  genesisChainOptions: NetworkFilterOption[];
  chainFilterSelected: string[];
  setChainFilterSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setShowCompletedGenesis: (value: boolean) => void;
  showCompletedGenesis: boolean;
  metrics?: IndexToolbarMetric[];
};

export function GenesisMarketsToolbar({
  activeCampaignNames,
  displayedCompletedByCampaignSize,
  genesisChainOptions,
  chainFilterSelected,
  setChainFilterSelected,
  setShowCompletedGenesis,
  showCompletedGenesis,
  metrics,
}: GenesisMarketsToolbarProps) {
  const hasChainFilter = genesisChainOptions.length > 1;
  const hasActiveFilters = chainFilterSelected.length > 0;

  return (
    <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
      <div className="w-full lg:w-auto lg:min-w-0">
        <div className={INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS}>
          <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 flex-wrap">
              Active Campaign:
              {activeCampaignNames.map((name) => (
                <span key={name} className={INDEX_CORAL_INFO_TAG_CLASS}>
                  {name}
                </span>
              ))}
              {activeCampaignNames.length > 0 ? (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-tight border border-white/40 bg-white/10 text-white">
                  2.0
                </span>
              ) : null}
            </span>
          </h2>
          {displayedCompletedByCampaignSize > 0 && (
            <div className={`${INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS} gap-1.5 sm:gap-2`}>
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider shrink-0">
                Genesis:
              </span>
              {hasChainFilter && (
                <IndexToolbarNetworkFilter
                  options={genesisChainOptions}
                  value={chainFilterSelected}
                  onChange={setChainFilterSelected}
                  minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
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
              {hasChainFilter ? (
                <IndexToolbarClearFiltersButton
                  onClick={() => setChainFilterSelected([])}
                  visible={hasActiveFilters}
                />
              ) : null}
            </div>
          )}
          {displayedCompletedByCampaignSize === 0 && hasChainFilter && (
            <div className={`${INDEX_MARKETS_TOOLBAR_FILTERS_ROW_CLASS} gap-2`}>
              <IndexToolbarNetworkFilter
                options={genesisChainOptions}
                value={chainFilterSelected}
                onChange={setChainFilterSelected}
                minWidthClass="w-full min-w-0 sm:w-auto sm:min-w-[235px]"
              />
              <IndexToolbarClearFiltersButton
                onClick={() => setChainFilterSelected([])}
                visible={hasActiveFilters}
              />
            </div>
          )}
        </div>
      </div>
      <div className="w-full lg:ml-auto lg:w-auto lg:min-w-0 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
        {metrics && metrics.length > 0 ? (
          <div className="w-full lg:w-auto">
            <IndexToolbarMetricsGroup metrics={metrics} className="w-full lg:w-auto" />
          </div>
        ) : null}
        <LedgerMarksCompactBadge
          className="max-w-full lg:w-auto"
          pillClassName="text-xs sm:text-sm max-w-full min-h-[52px] px-3 py-1.5 justify-center lg:justify-start"
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
