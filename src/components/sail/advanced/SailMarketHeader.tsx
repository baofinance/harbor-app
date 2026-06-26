"use client";

import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMarketDropdown } from "./SailMarketDropdown";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import {
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_ADVANCED_META,
  SAIL_ADVANCED_SECTION_LABEL,
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
};

/** Compact market switcher — metrics live in the left column. */
export function SailMarketHeader({
  selectedMarketId,
  selectedMarket,
  dropdownOptions,
  onSelectMarket,
  walletStats,
}: SailMarketHeaderProps) {
  if (!selectedMarket) return null;

  return (
    <div className="relative z-40 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-nowrap items-stretch gap-3 lg:gap-4">
          <div className="min-w-0 w-full max-w-lg shrink-0">
            <p className={SAIL_ADVANCED_SECTION_LABEL}>Market</p>
            <SailMarketDropdown
              selectedMarketId={selectedMarketId}
              options={dropdownOptions}
              onSelect={onSelectMarket}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`overflow-hidden rounded-xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`}
            >
              <p
                className={`border-b border-[#1E4775]/10 px-3 py-1.5 ${SAIL_ADVANCED_LIGHT_SECTION_TITLE}`}
              >
                Your wallet
              </p>
              <SailWalletStatsStrip
                {...walletStats}
                embedded
                className="min-w-0 w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center px-1 sm:items-start sm:gap-3 sm:self-start sm:pt-2">
        <NetworkIconCell
          chainName={harborMarketChainKey(selectedMarket)}
          chainLogo={selectedMarket.chain?.logo}
        />
        <span className={SAIL_ADVANCED_META}>
          {harborMarketChainKey(selectedMarket)}
        </span>
      </div>
    </div>
  );
}
