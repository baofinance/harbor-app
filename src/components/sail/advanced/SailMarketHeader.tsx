"use client";

import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMarketDropdown } from "./SailMarketDropdown";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import { SAIL_ADVANCED_META } from "./sailAdvancedStyles";

type SailMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  dropdownOptions: Array<{
    marketId: string;
    market: DefinedMarket;
    tvlUSD?: number;
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
    <div className="relative z-40 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="min-w-0 w-full max-w-lg shrink-0">
          <SailMarketDropdown
            selectedMarketId={selectedMarketId}
            options={dropdownOptions}
            onSelect={onSelectMarket}
          />
        </div>
        <SailWalletStatsStrip
          {...walletStats}
          className="flex w-full justify-start lg:justify-end"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 px-1">
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
