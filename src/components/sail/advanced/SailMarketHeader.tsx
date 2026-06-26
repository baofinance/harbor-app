"use client";

import type { DefinedMarket } from "@/config/markets";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { formatLeverage, formatUSD } from "@/utils/sailDisplayFormat";
import { SailFeeRatioCell } from "@/components/sail/SailFeeRatioCell";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMarketDropdown } from "./SailMarketDropdown";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_HEADLINE,
  SAIL_ADVANCED_META,
  SAIL_ADVANCED_PANEL,
  SAIL_ADVANCED_SHELL,
} from "./sailAdvancedStyles";

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
};

export function SailMarketHeader({
  selectedMarketId,
  selectedMarket,
  metrics,
  dropdownOptions,
  onSelectMarket,
}: SailMarketHeaderProps) {
  if (!selectedMarket) return null;

  const statItems = [
    { label: "TVL", value: metrics?.tvlUSD !== undefined ? formatUSD(metrics.tvlUSD) : "—" },
    { label: "Leverage", value: formatLeverage(metrics?.leverageRatio) },
    {
      label: "Mint fee",
      value: (
        <SailFeeRatioCell
          ratio={metrics?.mintFeeRatio}
          isMintSail
          activeBand={metrics?.activeMintBand}
        />
      ),
    },
    {
      label: "Redeem fee",
      value: (
        <SailFeeRatioCell
          ratio={metrics?.redeemFeeRatio}
          isMintSail={false}
          activeBand={metrics?.activeRedeemBand}
        />
      ),
    },
    { label: "Collateral", value: metrics?.collateralSymbol || "—" },
  ];

  return (
    <section className={`${SAIL_ADVANCED_SHELL} px-4 py-3 sm:px-5 sm:py-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 max-w-xl">
          <SailMarketDropdown
            selectedMarketId={selectedMarketId}
            options={dropdownOptions}
            onSelect={onSelectMarket}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NetworkIconCell
            chainName={harborMarketChainKey(selectedMarket)}
            chainLogo={selectedMarket.chain?.logo}
          />
          <span className={SAIL_ADVANCED_META}>
            {harborMarketChainKey(selectedMarket)}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statItems.map(({ label, value }) => (
          <div key={label} className={`${SAIL_ADVANCED_PANEL} px-3 py-2 text-center`}>
            <div className={SAIL_ADVANCED_CAPTION}>{label}</div>
            <div className={`mt-0.5 ${SAIL_ADVANCED_HEADLINE} text-sm text-white`}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
