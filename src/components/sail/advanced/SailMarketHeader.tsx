"use client";

import type { DefinedMarket } from "@/config/markets";
import {
  formatSailMarketDescription,
  type SailMarketDetailMetrics,
} from "@/utils/sailMarketMetrics";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMarketDropdown } from "./SailMarketDropdown";
import {
  SailWalletStatsStrip,
  type SailWalletStatsStripProps,
} from "./SailWalletStatsStrip";
import { SAIL_ADVANCED_BODY, SAIL_ADVANCED_META } from "./sailAdvancedStyles";

type SailMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  metrics: SailMarketDetailMetrics | undefined;
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
  metrics,
  dropdownOptions,
  onSelectMarket,
  walletStats,
}: SailMarketHeaderProps) {
  if (!selectedMarket) return null;

  const marketDescription = formatSailMarketDescription(selectedMarket, metrics);

  return (
    <div className="relative z-40 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-3 lg:gap-4">
        <div className="min-w-0 w-full max-w-lg shrink-0">
          <SailMarketDropdown
            selectedMarketId={selectedMarketId}
            options={dropdownOptions}
            onSelect={onSelectMarket}
          />
          <p className={`mt-1.5 ${SAIL_ADVANCED_BODY} text-white/70`}>
            {marketDescription}
          </p>
        </div>
        <SailWalletStatsStrip
          {...walletStats}
          className="min-w-0 flex-1 justify-end"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center px-1 sm:self-start sm:pt-2">
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
