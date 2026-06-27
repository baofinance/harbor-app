"use client";

import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { formatSailMarketEarnDescription } from "@/utils/sailMarketDirectionLabels";
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
  SAIL_ADVANCED_BODY,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_META,
  SAIL_ADVANCED_SHELL,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>Market</p>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-full min-w-0 max-w-xs shrink-0 sm:max-w-sm">
              <SailMarketDropdown
                selectedMarketId={selectedMarketId}
                options={dropdownOptions}
                onSelect={onSelectMarket}
              />
            </div>
            <p className={`min-w-0 flex-1 ${SAIL_ADVANCED_BODY}`}>
              {formatSailMarketEarnDescription(selectedMarket)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start px-1 sm:pt-6">
          <NetworkIconCell
            chainName={harborMarketChainKey(selectedMarket)}
            chainLogo={selectedMarket.chain?.logo}
          />
          <span className={SAIL_ADVANCED_META}>
            {harborMarketChainKey(selectedMarket)}
          </span>
        </div>
      </div>

      <section className={`${SAIL_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className={`${SAIL_ADVANCED_LABEL} mb-2`}>Your wallet</h2>
            <SailWalletStatsStrip {...walletStats} className="min-w-0 w-full" />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-md lg:max-w-none lg:flex-1">
            <h2 className={`${SAIL_ADVANCED_LABEL} mb-2`}>This market</h2>
            <SailMarketPositionBar
              market={selectedMarket}
              {...marketPosition}
              className="min-w-0 w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
