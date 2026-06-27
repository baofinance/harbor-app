"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailMarketEarnTagline } from "./SailMarketEarnTagline";
import { SailMarketDropdown } from "./SailMarketDropdown";
import {
  SailMarketPositionBar,
  type SailMarketPositionBarProps,
} from "./SailMarketPositionBar";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import {
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_MAIN_GRID_COLUMNS,
} from "./sailAdvancedStyles";

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
};

/** Market switcher + wallet / this-market stats under the dropdown. */
export function SailMarketHeader({
  selectedMarketId,
  selectedMarket,
  dropdownOptions,
  onSelectMarket,
  walletStats,
  marketPosition,
}: SailMarketHeaderProps) {
  if (!selectedMarket) return null;

  return (
    <div className="relative z-40 flex flex-col gap-3">
      <div className="min-w-0">
        <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Market</p>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="w-full min-w-0 max-w-xs shrink-0 sm:max-w-sm">
            <SailMarketDropdown
              selectedMarketId={selectedMarketId}
              options={dropdownOptions}
              onSelect={onSelectMarket}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center text-center">
            <SailMarketEarnTagline market={selectedMarket} />
          </div>
        </div>
      </div>

      <div className={SAIL_ADVANCED_MAIN_GRID_COLUMNS}>
        <div className="min-w-0">
          <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Your wallet</p>
          <SailWalletStatsStrip {...walletStats} className="min-w-0 w-full" />
        </div>
        <div className="min-w-0">
          <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>This market</p>
          <SailMarketPositionBar
            market={selectedMarket}
            {...marketPosition}
            className="min-w-0 w-full"
          />
        </div>
      </div>
    </div>
  );
}
