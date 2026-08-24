"use client";

import type { DefinedMarket } from "@/config/markets";
import { AnchorMarketDropdown, type AnchorMarketDropdownOption } from "./AnchorMarketDropdown";
import { AnchorMarketEducationStrip } from "./AnchorMarketEducationStrip";
import { AnchorMarketPositionBar, type AnchorMarketPositionBarProps } from "./AnchorMarketPositionBar";
import { AnchorMarketTagline } from "./AnchorMarketTagline";
import {
  AnchorWalletStatsStrip,
  type AnchorWalletStatsStripProps,
} from "./AnchorWalletStatsStrip";
import { ANCHOR_ADVANCED_LABEL } from "./anchorAdvancedStyles";

const HEADER_STATS_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch";

type AnchorMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  dropdownOptions: AnchorMarketDropdownOption[];
  onSelectMarket: (marketId: string) => void;
  walletStats: AnchorWalletStatsStripProps;
  marketPosition: Omit<AnchorMarketPositionBarProps, "market">;
  educationBestAprLabel?: string;
};

export function AnchorMarketHeader({
  selectedMarketId,
  selectedMarket,
  dropdownOptions,
  onSelectMarket,
  walletStats,
  marketPosition,
  educationBestAprLabel,
}: AnchorMarketHeaderProps) {
  if (!selectedMarket) return null;

  const isConnected = marketPosition.isConnected;

  return (
    <header className="relative z-10 flex flex-col gap-4">
      <div className="min-w-0">
        <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>Market</p>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="w-full min-w-0 max-w-xs shrink-0 sm:max-w-sm">
            <AnchorMarketDropdown
              selectedMarketId={selectedMarketId}
              options={dropdownOptions}
              onSelect={onSelectMarket}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center text-center sm:pl-1">
            <AnchorMarketTagline market={selectedMarket} />
          </div>
        </div>
      </div>

      {isConnected ? (
        <div className={HEADER_STATS_GRID_CLASS}>
          <div className="flex min-h-0 min-w-0 flex-col">
            <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>Your wallet</p>
            <AnchorWalletStatsStrip
              {...walletStats}
              className="min-h-0 w-full flex-1"
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>This market</p>
            <AnchorMarketPositionBar
              market={selectedMarket}
              {...marketPosition}
              className="min-h-0 w-full flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>This market</p>
          <AnchorMarketEducationStrip
            pegTarget={selectedMarket.pegTarget}
            bestAprLabel={educationBestAprLabel}
            className="min-w-0 w-full"
          />
        </div>
      )}
    </header>
  );
}
