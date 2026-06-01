"use client";

import { formatEther } from "viem";
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

function resolveStatusLabel(
  contractEnded: boolean,
  hasClaimable: boolean,
  mkt: GenesisMarketConfig,
): string {
  if (contractEnded && hasClaimable) return "Claim available";
  if (contractEnded) return "Launched";
  if (isGenesisCompletedUi(mkt)) return "Completed";
  return "Processing";
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

  if (rows.length === 0) return null;

  return (
    <section className="mb-8" aria-label="Completed voyages">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">
        Completed voyages
      </h2>
      <div className="space-y-2">
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
          const statusLabel = resolveStatusLabel(
            contractEnded,
            hasClaimable,
            mkt,
          );
          const depositsLabel =
            totalDepositsUsd > 0
              ? `${formatUSD(totalDepositsUsd)} total deposits`
              : "No deposits recorded";

          return (
            <div
              key={id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/90">
                    {displayMarketName}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    {getGenesisMarketTypeLabel(mkt.pegTarget)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    {statusLabel}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <GenesisMarketCollateralEquationStrip
                    collateralSymbol={collateralSymbol}
                    peggedSymbol={peggedSymbol}
                    leveragedSymbol={leveragedSymbol}
                    iconSize={18}
                  />
                  <span className="text-xs text-white/45">{depositsLabel}</span>
                </div>
              </div>
              <div className="flex shrink-0 justify-end">
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
