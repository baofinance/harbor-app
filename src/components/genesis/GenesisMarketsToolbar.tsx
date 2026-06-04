"use client";

/**
 * Filter / controls row: active campaign pill, Genesis Ongoing/All, network filter.
 * @see docs/routes/genesis.md
 */
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
  genesisChainOptions: NetworkFilterOption[];
  chainFilterSelected: string[];
  setChainFilterSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setShowCompletedGenesis: (value: boolean) => void;
  showCompletedGenesis: boolean;
  metrics?: IndexToolbarMetric[];
};

export function GenesisMarketsToolbar({
  activeCampaignNames,
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
            </span>
          </h2>
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
        </div>
      </div>
      {metrics && metrics.length > 0 ? (
        <div className="w-full lg:ml-auto lg:w-auto lg:min-w-0 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <div className="w-full lg:w-auto">
            <IndexToolbarMetricsGroup metrics={metrics} className="w-full lg:w-auto" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
