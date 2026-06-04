"use client";

import { useCallback } from "react";
import { formatEther } from "viem";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  FEATURED_COMPLETED_MARKET_IDS,
  getGenesisMarketTypeLabel,
} from "@/config/maidenVoyageFeatured";
import {
  isGenesisCompletedUi,
  isMarketInMaintenance,
} from "@/config/markets";
import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { formatUSD } from "@/utils/formatters";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";
import { GenesisMarketRowClaimActions } from "./GenesisMarketRowClaimActions";
import { GenesisMarketCollateralEquationStrip } from "./GenesisMarketSharedRowCells";
import { readContractRowResult } from "./readContractRow";
import type { GenesisClaimMarketArgs } from "./GenesisCompletedMarketsSection";
import { GenesisVoyageCompletedBadge } from "./GenesisVoyageLifecycleBadge";
import { MV_TABLE_ROW, MV_TYPE_TAG } from "./maidenVoyageLayoutStyles";

export type GenesisFeaturedCompletedVoyagesProps = {
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  totalDepositsReads: readonly unknown[] | undefined;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  claimingMarket: string | null;
  collateralPricesMap: Map<string, CollateralPriceData>;
  coinGeckoPrices: Record<string, number | null>;
  coinGeckoLoading: boolean;
  chainlinkBtcPrice: number | null;
  onClaim: (args: GenesisClaimMarketArgs) => Promise<void>;
  onManage: (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab?: "deposit" | "withdraw",
  ) => void;
};

function resolveDisplayName(mkt: GenesisMarketConfig): string {
  const rowLeveragedSymbol = mkt.leveragedToken?.symbol;
  const raw =
    rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
      ? rowLeveragedSymbol.slice(2)
      : rowLeveragedSymbol || mkt.name || "Market";
  return formatGenesisMarketDisplayName(raw);
}

function formatLaunchDate(endDate?: string): string | null {
  if (!endDate) return null;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function GenesisFeaturedCompletedVoyages({
  genesisMarkets,
  reads,
  totalDepositsReads,
  isConnected,
  address,
  claimingMarket,
  collateralPricesMap,
  coinGeckoPrices,
  coinGeckoLoading,
  chainlinkBtcPrice,
  onClaim,
  onManage,
}: GenesisFeaturedCompletedVoyagesProps) {
  const rows = FEATURED_COMPLETED_MARKET_IDS.map((id) => {
    const entry = genesisMarkets.find(([mid]) => mid === id);
    return entry ? ([id, entry[1]] as [string, GenesisMarketConfig]) : null;
  }).filter((row): row is [string, GenesisMarketConfig] => row != null);

  const scrollToList = useCallback(() => {
    document.getElementById("maiden-voyage-completed-list")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  if (rows.length === 0) return null;

  return (
    <section
      id="maiden-voyage-completed"
      className="mb-8 scroll-mt-24"
      aria-label="Completed voyages"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">
            Completed Voyages
          </h2>
          <p className="mt-1 text-sm text-white/50">
            These markets have launched. Claims remain available.
          </p>
        </div>
        <button
          type="button"
          onClick={scrollToList}
          className="text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
        >
          View all ({rows.length})
        </button>
      </div>

      <div id="maiden-voyage-completed-list" className="space-y-2">
        {rows.map(([id, mkt]) => {
          const mi = genesisMarkets.findIndex((m) => m[0] === id);
          const baseOffset = mi * (isConnected ? 3 : 1);
          const contractEnded =
            readContractRowResult<boolean>(reads, baseOffset) ?? false;
          const isEnded = contractEnded;
          const claimableResult = isConnected
            ? readContractRowResult<[bigint, bigint]>(reads, baseOffset + 2)
            : undefined;
          const claimablePegged = claimableResult?.[0] || 0n;
          const claimableLeveraged = claimableResult?.[1] || 0n;
          const hasClaimable =
            claimablePegged > 0n || claimableLeveraged > 0n;
          const genesisAddress = mkt.addresses?.genesis;
          const collateralSymbol = mkt.collateral?.symbol || "ETH";
          const oracleAddress = mkt.addresses?.collateralPrice as
            | `0x${string}`
            | undefined;
          const collateralPriceData = oracleAddress
            ? collateralPricesMap.get(oracleAddress.toLowerCase())
            : undefined;
          const underlyingSymbol =
            mkt.collateral?.underlyingSymbol || collateralSymbol;
          const { collateralPriceUSD } = computeGenesisRowUsdPricing({
            underlyingSymbol,
            pegTarget: mkt.pegTarget,
            marketCoinGeckoId: mkt.coinGeckoId,
            coinGeckoPrices,
            collateralPriceData,
            chainlinkBtcPrice,
            coinGeckoLoading,
            collateralSymbol,
          });
          const totalDeposits = readContractRowResult<bigint>(
            totalDepositsReads,
            mi,
          );
          const totalDepositsUsd =
            totalDeposits && collateralPriceUSD > 0
              ? Number(formatEther(totalDeposits)) * collateralPriceUSD
              : 0;
          const displayMarketName = resolveDisplayName(mkt);
          const peggedSymbol = mkt.peggedToken?.symbol || "ha";
          const leveragedSymbol = mkt.leveragedToken?.symbol || "hs";
          const peggedNoPrefix =
            peggedSymbol.toLowerCase().startsWith("ha")
              ? peggedSymbol.slice(2)
              : peggedSymbol;
          const launchDateLabel = formatLaunchDate(mkt.genesis?.endDate);
          const showCompletedPill =
            contractEnded || isGenesisCompletedUi(mkt);

          return (
            <div
              key={id}
              className={`${MV_TABLE_ROW} px-4 md:grid-cols-[minmax(0,1.4fr)_auto_auto_auto_auto] md:gap-4`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/90">
                    {displayMarketName}
                  </span>
                  <span className={MV_TYPE_TAG}>
                    {getGenesisMarketTypeLabel(mkt.pegTarget)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <GenesisMarketCollateralEquationStrip
                    collateralSymbol={collateralSymbol}
                    peggedSymbol={peggedSymbol}
                    leveragedSymbol={leveragedSymbol}
                    iconSize={18}
                  />
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Total Deposits
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums text-white/85">
                  {totalDepositsUsd > 0
                    ? formatUSD(totalDepositsUsd)
                    : "—"}
                </p>
              </div>

              {launchDateLabel ? (
                <div className="md:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Launched
                  </p>
                  <p className="text-sm font-medium text-[#4A9784]">
                    {launchDateLabel}
                  </p>
                </div>
              ) : (
                <div className="hidden md:block" aria-hidden />
              )}

              <div className="flex items-center md:justify-end">
                {showCompletedPill ? <GenesisVoyageCompletedBadge /> : null}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
                <GenesisMarketRowClaimActions
                  variant="responsive"
                  isEnded={isEnded}
                  showMaintenanceTag={isMarketInMaintenance(mkt)}
                  hasClaimable={hasClaimable}
                  genesisAddress={genesisAddress}
                  walletAddress={address}
                  isClaimingThisMarket={claimingMarket === id}
                  onClaim={() =>
                    onClaim({
                      marketId: id,
                      genesisAddress,
                      displayMarketName,
                      peggedSymbolForShare: peggedNoPrefix,
                    })
                  }
                  onManage={() => onManage(id, mkt, "withdraw")}
                  manageButtonLabel="Manage"
                />
                <ChevronDownIcon
                  className="hidden h-4 w-4 text-white/30 md:block"
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
