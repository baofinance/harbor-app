"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { formatEther } from "viem";
import {
  isFeaturedMaidenVoyageMarket,
} from "@/config/maidenVoyageFeatured";
import {
  isGenesisDepositWithdrawBlockedByConfig,
  isMarketArchived,
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

export type GenesisOtherVoyagesSectionProps = {
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
  defaultExpanded?: boolean;
};

function resolveDisplayName(mkt: GenesisMarketConfig): string {
  const rowLeveragedSymbol = mkt.leveragedToken?.symbol;
  const raw =
    rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
      ? rowLeveragedSymbol.slice(2)
      : rowLeveragedSymbol || mkt.name || "Market";
  return formatGenesisMarketDisplayName(raw);
}

export function GenesisOtherVoyagesSection({
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
  defaultExpanded = false,
}: GenesisOtherVoyagesSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const otherMarkets = genesisMarkets.filter(
    ([id]) => !isFeaturedMaidenVoyageMarket(id),
  );

  if (otherMarkets.length === 0) return null;

  return (
    <section className="mb-6" aria-label="Other voyages">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-white/55">
          Other voyages ({otherMarkets.length})
        </span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-white/50" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-white/50" />
        )}
      </button>

      {expanded ? (
        <div className="mt-2 space-y-2">
          {otherMarkets.map(([id, mkt]) => {
            const mi = genesisMarkets.findIndex((m) => m[0] === id);
            const baseOffset = mi * (isConnected ? 3 : 1);
            const isEnded =
              readContractRowResult<boolean>(reads, baseOffset) ?? false;
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
            const depositBlocked = isGenesisDepositWithdrawBlockedByConfig(mkt);
            const archived = isMarketArchived(mkt);

            return (
              <div
                key={id}
                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white/75">
                      {displayMarketName}
                    </span>
                    {archived ? (
                      <span className="text-[10px] uppercase tracking-wide text-white/35">
                        Archived
                      </span>
                    ) : null}
                    <span className="text-[10px] uppercase tracking-wide text-white/35">
                      {isEnded ? "Launched" : "Open"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <GenesisMarketCollateralEquationStrip
                      collateralSymbol={collateralSymbol}
                      peggedSymbol={peggedSymbol}
                      leveragedSymbol={leveragedSymbol}
                      iconSize={16}
                    />
                    {totalDepositsUsd > 0 ? (
                      <span className="text-xs text-white/40">
                        {formatUSD(totalDepositsUsd)} deposited
                      </span>
                    ) : null}
                  </div>
                </div>
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
                  onManage={() =>
                    onManage(
                      id,
                      mkt,
                      archived || depositBlocked ? "withdraw" : "deposit",
                    )
                  }
                  manageButtonLabel={
                    archived || depositBlocked ? "Withdraw" : "Manage"
                  }
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
