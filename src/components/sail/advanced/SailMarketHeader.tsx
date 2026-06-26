"use client";

import type { DefinedMarket } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMarketDirectionChips } from "@/components/sail/SailMarketDirectionChips";
import { SailMarketDropdown } from "./SailMarketDropdown";
import { SAIL_ADVANCED_META } from "./sailAdvancedStyles";

type SailMarketHeaderProps = {
  selectedMarketId: string | null;
  selectedMarket: DefinedMarket | null;
  longSide?: string;
  shortSide?: string;
  dropdownOptions: Array<{
    marketId: string;
    market: DefinedMarket;
    tvlUSD?: number;
  }>;
  onSelectMarket: (marketId: string) => void;
};

/** Compact market switcher — metrics live in the left column. */
export function SailMarketHeader({
  selectedMarketId,
  selectedMarket,
  longSide,
  shortSide,
  dropdownOptions,
  onSelectMarket,
}: SailMarketHeaderProps) {
  const resolvedLong = longSide ?? (selectedMarket ? getLongSide(selectedMarket) : "");
  const resolvedShort =
    shortSide ?? (selectedMarket ? getShortSide(selectedMarket) : "");

  if (!selectedMarket) return null;

  return (
    <div className="relative z-40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 max-w-md">
          <SailMarketDropdown
            selectedMarketId={selectedMarketId}
            options={dropdownOptions}
            onSelect={onSelectMarket}
          />
        </div>
        <SailMarketDirectionChips
          market={selectedMarket}
          longSide={resolvedLong}
          shortSide={resolvedShort}
          className="shrink-0"
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
