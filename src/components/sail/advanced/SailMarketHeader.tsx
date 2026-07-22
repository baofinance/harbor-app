"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailMarketEarnTagline } from "./SailMarketEarnTagline";
import { SailMarketDropdown } from "./SailMarketDropdown";
import { SailMarketEducationStrip } from "./SailMarketEducationStrip";
import {
  SailMarketPositionBar,
  type SailMarketPositionBarProps,
} from "./SailMarketPositionBar";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import {
  SAIL_ADVANCED_HEADER_DIVIDER,
  SAIL_ADVANCED_HEADER_SHELL,
  SAIL_ADVANCED_LABEL,
} from "./sailAdvancedStyles";

/** Equal-width wallet / this-market row (not tied to chart+trade column widths). */
const SAIL_HEADER_STATS_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch";

type SailMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  dropdownOptions: Array<{
    marketId: string;
    market: DefinedMarket;
    leverageRatio?: bigint;
    hasPosition?: boolean;
    positionLabel?: string;
  }>;
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

  return (
    <header className={`relative z-40 ${SAIL_ADVANCED_HEADER_SHELL}`}>
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Market</p>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-full min-w-0 max-w-xs shrink-0 sm:max-w-sm">
              <SailMarketDropdown
                selectedMarketId={selectedMarketId}
                options={dropdownOptions}
                onSelect={onSelectMarket}
              />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center text-center sm:pl-1">
              <SailMarketEarnTagline market={selectedMarket} />
            </div>
          </div>
        </div>

        <div className={SAIL_ADVANCED_HEADER_DIVIDER} role="presentation" />

        {isConnected ? (
          <div className={SAIL_HEADER_STATS_GRID_CLASS}>
            <div className="min-w-0">
              <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Your wallet</p>
              <SailWalletStatsStrip {...walletStats} className="min-w-0 w-full" />
            </div>
            <div className="min-w-0">
              <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>This market</p>
              <SailMarketPositionBar
                market={selectedMarket}
                {...marketPosition}
                leverageRatio={leverageRatio}
                rebalanceThresholdLabel={rebalanceThresholdLabel}
                className="min-w-0 w-full"
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
      </div>
    </header>
  );
}
