"use client";

/**
 * Filter / controls row: active campaign pill, Genesis Ongoing/All, network filter, Ledger Marks badge.
 * @see src/app/genesis/README.md
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import LedgerMarksCompactBadge from "@/components/LedgerMarksCompactBadge";
import SimpleTooltip from "@/components/SimpleTooltip";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";

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
};

export function GenesisMarketsToolbar({
  activeCampaignName,
  displayedCompletedByCampaignSize,
  genesisChainOptions,
  chainFilterSelected,
  setChainFilterSelected,
  setShowCompletedGenesis,
  showCompletedGenesis,
}: GenesisMarketsToolbarProps) {
  return (
    <div className="pt-4 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-wrap">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-2">
          Active Campaign:
          {activeCampaignName && (
            <span className="inline-flex items-center px-2.5 py-1 bg-[#E67A6B] hover:bg-[#D66A5B] border border-white text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors">
              {activeCampaignName}
            </span>
          )}
        </h2>
        {displayedCompletedByCampaignSize > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              Genesis:
            </span>
            <button
              type="button"
              onClick={() => setShowCompletedGenesis(false)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                !showCompletedGenesis
                  ? "bg-white text-[#1E4775]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Ongoing
            </button>
            <button
              type="button"
              onClick={() => setShowCompletedGenesis(true)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                showCompletedGenesis
                  ? "bg-white text-[#1E4775]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All
            </button>
          </div>
        )}
        {genesisChainOptions.length > 1 && (
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
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <LedgerMarksCompactBadge
          className="md:ml-auto"
          tooltipMaxWidth="min(90vw, 22rem)"
          intro={
            <p>
              Active Maiden Voyage Genesis campaigns use the incentive rates
              below. Exact bonuses depend on the campaign you joined.
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
                  marks on Maiden Voyage completion (where the campaign offers
                  it).
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
                Genesis / Maiden Voyage: 10 marks / $ / day
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
