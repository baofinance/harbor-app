"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailMarketEarnTagline } from "./SailMarketEarnTagline";
import {
  SailMarketDropdown,
  type SailMarketDropdownOption,
} from "./SailMarketDropdown";
import { SailTokenPairSelectors } from "./SailTokenPairSelectors";
import { SailMarketEducationStrip } from "./SailMarketEducationStrip";
import {
  SailMarketPositionBar,
  type SailMarketPositionBarProps,
} from "./SailMarketPositionBar";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import { SAIL_ADVANCED_LABEL } from "./sailAdvancedStyles";

const SAIL_HEADER_STATS_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch";

type SailMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  dropdownOptions: SailMarketDropdownOption[];
  onSelectMarket: (marketId: string) => void;
  walletStats: SailWalletStatsStripProps;
  marketPosition: Omit<SailMarketPositionBarProps, "market">;
  leverageRatio?: bigint;
  rebalanceThresholdLabel?: string;
};

/** Market switcher + wallet / this-market stats under the dropdown. */
export function SailMarketHeader({
  selectedMarketId,
  selectedMarket,
  dropdownOptions,
  onSelectMarket,
  walletStats,
  marketPosition,
  leverageRatio,
  rebalanceThresholdLabel,
}: SailMarketHeaderProps) {
  if (!selectedMarket) return null;

  const isConnected = marketPosition.isConnected;
  const usePairSelectors = dropdownOptions.length > 1;

  return (
    <header className="relative z-10 flex flex-col gap-4 overflow-visible">
      <div className="min-w-0 overflow-visible">
        <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Market</p>
        <div className="grid min-w-0 gap-4 overflow-visible lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
          {usePairSelectors ? (
            <SailTokenPairSelectors
              options={dropdownOptions}
              selectedMarketId={selectedMarketId}
              onSelectMarket={onSelectMarket}
            />
          ) : (
            <div className="w-full min-w-0 max-w-xs shrink-0 sm:max-w-sm">
              <SailMarketDropdown
                selectedMarketId={selectedMarketId}
                options={dropdownOptions}
                onSelect={onSelectMarket}
              />
            </div>
          )}
          <div className="flex w-full min-w-0 items-center justify-center">
            <SailMarketEarnTagline market={selectedMarket} />
          </div>
        </div>
      </div>

      {isConnected ? (
        <div className={SAIL_HEADER_STATS_GRID_CLASS}>
          <div className="flex min-h-0 min-w-0 flex-col">
            <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Your wallet</p>
            <SailWalletStatsStrip
              {...walletStats}
              className="min-h-0 w-full flex-1"
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>This market</p>
            <SailMarketPositionBar
              market={selectedMarket}
              {...marketPosition}
              leverageRatio={leverageRatio}
              rebalanceThresholdLabel={rebalanceThresholdLabel}
              className="min-h-0 w-full flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>This market</p>
          <SailMarketEducationStrip
            leverageRatio={leverageRatio}
            rebalanceThresholdLabel={rebalanceThresholdLabel}
            className="min-w-0 w-full"
          />
        </div>
      )}
    </header>
  );
}
