"use client";

import React from "react";
import Image from "next/image";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import SimpleTooltip from "@/components/SimpleTooltip";
import NetworkIconCell from "@/components/NetworkIconCell";
import { RewardTokensDisplay } from "@/components/anchor/RewardTokensDisplay";
import { getLogoPath } from "@/components/shared";
import { formatCompactUSD } from "@/utils/anchor";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import {
  ANCHOR_MARKETS_TABLE_ROW_LG_CLASSNAME,
  ANCHOR_MARKETS_TABLE_ROW_MD_CLASSNAME,
} from "./anchorMarketsTableGrid";
import { INDEX_MANAGE_BUTTON_CLASS_DESKTOP } from "@/utils/indexPageManageButton";
import type { DefinedMarket } from "@/config/markets";

export type AnchorMarketGroupCollapsedRowProps = {
  symbol: string;
  isExpanded: boolean;
  peggedTokenSymbol: string | undefined;
  groupHasMaintenance: boolean;
  marketList: Array<{
    marketId: string;
    market: DefinedMarket;
    marketIndex: number;
  }>;
  marketsData: MarketData[];
  minAPR: number;
  maxAPR: number;
  minProjectedAPR: number | null;
  maxProjectedAPR: number | null;
  collateralPoolAPRMin: number | null;
  collateralPoolAPRMax: number | null;
  sailPoolAPRMin: number | null;
  sailPoolAPRMax: number | null;
  combinedPositionUSD: number;
  combinedPositionTokens: number;
  combinedRewardsUSD: number;
  collateralPoolAddress?: `0x${string}`;
  sailPoolAddress?: `0x${string}`;
  rewardPoolAddresses: `0x${string}`[];
  allDepositAssets: Array<{ symbol: string; name: string }>;
  directlyZappableAssets: Array<{ symbol: string; name: string }>;
  isCollateralOnlyRow: boolean;
  isMegaEthRow: boolean;
  /** Wrapped collateral symbol for deposit-mode copy (e.g. fxSAVE, wstETH). */
  collateralSymbol: string;
  poolRewardsMap: Map<`0x${string}`, any>;
  isErrorAllRewards: boolean;
  showLiveAprLoading: boolean;
  projectedAPR: {
    hasRewardsNoTVL: boolean;
    collateralPoolAPR: number | null;
    leveragedPoolAPR: number | null;
    harvestableAmount: bigint | null;
    remainingDays: number | null;
    collateralRewards7Day: bigint | null;
    leveragedRewards7Day: bigint | null;
  };
  isConnected: boolean;
  /** Stable callback from parent; pass `symbol` so rows don’t close over a new inline function each render. */
  onToggleExpand: (symbol: string) => void;
  onOpenManage: (payload: {
    marketId: string;
    market: DefinedMarket;
    initialTab?:
      | "mint"
      | "deposit"
      | "withdraw"
      | "redeem"
      | "deposit-mint"
      | "withdraw-redeem";
    simpleMode?: boolean;
    bestPoolType?: "collateral" | "sail";
    allMarkets?: Array<{ marketId: string; market: DefinedMarket }>;
    initialDepositAsset?: string;
  }) => void;
};

function AnchorMarketGroupCollapsedRowInner(
  props: AnchorMarketGroupCollapsedRowProps
) {
  const {
    symbol,
    isExpanded,
    peggedTokenSymbol,
    groupHasMaintenance,
    marketList,
    marketsData,
    minAPR,
    maxAPR,
    minProjectedAPR,
    maxProjectedAPR,
    collateralPoolAPRMin,
    collateralPoolAPRMax,
    sailPoolAPRMin,
    sailPoolAPRMax,
    combinedPositionUSD,
    combinedPositionTokens,
    combinedRewardsUSD,
    collateralPoolAddress,
    sailPoolAddress,
    rewardPoolAddresses,
    allDepositAssets,
    directlyZappableAssets,
    isCollateralOnlyRow,
    isMegaEthRow,
    collateralSymbol,
    poolRewardsMap,
    isErrorAllRewards,
    showLiveAprLoading,
    projectedAPR,
    isConnected,
    onToggleExpand,
    onOpenManage,
  } = props;

  return (
<div
  className={`p-3 transition cursor-pointer ${
    isExpanded
      ? "bg-[rgb(var(--surface-selected-rgb))]"
      : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
  }`}
  onClick={(e) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") === null &&
      target.closest("[onclick]") === null
    ) {
      onToggleExpand(symbol);
    }
  }}
>
  {/* Mobile card layout (< md) - modeled after Maiden Voyage page */}
  <div className="md:hidden space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
            <SimpleTooltip
              label={peggedTokenSymbol || symbol}
            >
          <Image
                src={getLogoPath(
                  peggedTokenSymbol || symbol
                )}
            alt={peggedTokenSymbol || symbol}
            width={20}
            height={20}
            className="flex-shrink-0 cursor-help"
          />
        </SimpleTooltip>
        <span className="text-[#1E4775] font-semibold text-base truncate">
          {symbol}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        )}
      </div>

      <div
        className="flex items-center justify-end flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {groupHasMaintenance ? (
          <MarketMaintenanceTag />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isConnected) return;
              const enrichedAllMarkets = marketList.map(
                (m) => {
                  const marketData = marketsData.find(
                    (md) => md.marketId === m.marketId
                  );
                  return {
                    marketId: m.marketId,
                    market: {
                      ...m.market,
                      wrappedRate:
                        marketData?.wrappedRate,
                    },
                  };
                }
              );
              onOpenManage({
                marketId: marketList[0].marketId,
                market: {
                  ...marketList[0].market,
                  wrappedRate: marketsData.find(
                    (md) =>
                      md.marketId ===
                      marketList[0].marketId
                  )?.wrappedRate,
                },
                initialTab: "deposit",
                simpleMode: true,
                bestPoolType: "collateral",
                allMarkets: enrichedAllMarkets,
              });
            }}
            disabled={!isConnected}
            className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
          >
            Manage
          </button>
        )}
      </div>
    </div>

    {/* Mobile stats: single row, headers above values */}
    <div
      className="flex items-stretch justify-between gap-3 whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-end leading-tight min-w-0">
        <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
          APR
        </div>
        <div className="text-[#1E4775] font-semibold text-sm font-mono">
          {(() => {
                const hasCurrentAPR =
                  minAPR > 0 || maxAPR > 0;
            const hasProjectedAPR =
                  (minProjectedAPR !== null &&
                    minProjectedAPR > 0) ||
                  (maxProjectedAPR !== null &&
                    maxProjectedAPR > 0);
                const formatRange = (
                  min: number,
                  max: number
                ) => {
                  if (min > 0 && min !== max)
                    return `${min.toFixed(
                      1
                    )}% - ${max.toFixed(1)}%`;
              return `${max.toFixed(1)}%`;
            };
                const currentStr = hasCurrentAPR
                  ? formatRange(minAPR, maxAPR)
                  : "";
            const projMin =
                  minProjectedAPR !== null
                    ? minProjectedAPR
                    : maxProjectedAPR ?? 0;
            const projMax =
                  maxProjectedAPR !== null
                    ? maxProjectedAPR
                    : minProjectedAPR ?? 0;
                const projectedStr = hasProjectedAPR
                  ? formatRange(projMin, projMax)
                  : "";
                if (!hasCurrentAPR && !hasProjectedAPR)
                  return "-";
                if (!hasCurrentAPR)
                  return projectedStr
                    ? `Proj ${projectedStr}`
                    : "-";
            // Don't show projected APR if we have LIVE APRs
            return currentStr || "-";
          })()}
        </div>
      </div>

      <div className="flex flex-col items-end leading-tight min-w-0">
        <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
          Position
        </div>
        <div className="text-[#1E4775] font-semibold text-sm font-mono">
          {combinedPositionUSD > 0
            ? formatCompactUSD(combinedPositionUSD)
            : combinedPositionTokens > 0
                ? `${combinedPositionTokens.toLocaleString(
                    undefined,
                    {
                maximumFractionDigits: 2,
                    }
                  )} ${symbol}`
            : "-"}
        </div>
      </div>

      <div className="flex flex-col items-end leading-tight min-w-0">
        <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
          Earnings
        </div>
        <div className="text-[#1E4775] font-semibold text-sm font-mono">
              {combinedRewardsUSD > 0
                ? `$${combinedRewardsUSD.toFixed(2)}`
                : "-"}
        </div>
      </div>

      <div className="flex flex-col items-end leading-tight min-w-0">
        <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
          Rewards
        </div>
        <div className="mt-0.5 flex items-center justify-end">
          <RewardTokensDisplay
            collateralPool={collateralPoolAddress}
            sailPool={sailPoolAddress}
                poolAddresses={rewardPoolAddresses}
            iconSize={16}
            className="justify-end gap-1"
          />
        </div>
      </div>
    </div>
  </div>

  {/* Medium / narrow layout (md to < lg) */}
  <div className={ANCHOR_MARKETS_TABLE_ROW_MD_CLASSNAME}>
    <div className="flex items-center justify-center">
      <NetworkIconCell
        chainName={(marketList[0].market as any).chain?.name || "Ethereum"}
        chainLogo={(marketList[0].market as any).chain?.logo || "icons/eth.png"}
        size={18}
      />
    </div>
    <div className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-center gap-1.5 min-w-0">
            <SimpleTooltip
              label={peggedTokenSymbol || symbol}
            >
          <Image
                src={getLogoPath(
                  peggedTokenSymbol || symbol
                )}
            alt={peggedTokenSymbol || symbol}
            width={20}
            height={20}
            className="flex-shrink-0 cursor-help"
          />
        </SimpleTooltip>
        <span
          className="text-[#1E4775] font-medium text-sm truncate min-w-0"
          title={symbol}
        >
          {symbol}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        )}
      </div>
    </div>
    <div
      className="text-center min-w-0"
      onClick={(e) => e.stopPropagation()}
    >
      {(() => {
        const hasCurrentAPR = minAPR > 0 || maxAPR > 0;
        const hasProjectedAPR =
              (minProjectedAPR !== null &&
                minProjectedAPR > 0) ||
              (maxProjectedAPR !== null &&
                maxProjectedAPR > 0);
            const formatRange = (
              min: number,
              max: number
            ) => {
          if (min > 0 && min !== max) {
                return `${min.toFixed(1)}% - ${max.toFixed(
                  1
                )}%`;
          }
          return `${max.toFixed(1)}%`;
        };
            const currentStr = hasCurrentAPR
              ? formatRange(minAPR, maxAPR)
              : "";
        const projMin =
              minProjectedAPR !== null
                ? minProjectedAPR
                : maxProjectedAPR ?? 0;
        const projMax =
              maxProjectedAPR !== null
                ? maxProjectedAPR
                : minProjectedAPR ?? 0;
            const projectedStr = hasProjectedAPR
              ? formatRange(projMin, projMax)
              : "";

        if (!hasCurrentAPR && !hasProjectedAPR) {
              return (
                <span className="text-[#1E4775] font-bold text-sm font-mono">
                  -
                </span>
              );
        }

        if (!hasCurrentAPR && hasProjectedAPR) {
          return (
            <div className="flex flex-col items-center leading-tight">
                  <div className="text-[10px] text-[#1E4775]/60 font-semibold">
                    Proj
                  </div>
              <div className="text-[#1E4775] font-bold text-sm font-mono">
                {projectedStr}
              </div>
            </div>
          );
        }

        // Don't show projected APR if we have LIVE APRs
        if (hasCurrentAPR) {
          return (
            <span className="text-[#1E4775] font-bold text-sm font-mono">
              {currentStr}
            </span>
          );
        }

        return (
          <span className="text-[#1E4775] font-bold text-sm font-mono">
            {currentStr || "-"}
          </span>
        );
      })()}
    </div>
    <div className="text-center min-w-0">
      <div className="inline-flex items-stretch justify-center gap-4 whitespace-nowrap">
        <div className="flex flex-col items-center leading-tight">
          <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
            Position
          </div>
          <div className="text-[#1E4775] font-medium text-xs font-mono">
            {combinedPositionUSD > 0
              ? formatCompactUSD(combinedPositionUSD)
              : combinedPositionTokens > 0
                  ? `${combinedPositionTokens.toLocaleString(
                      undefined,
                      {
                  maximumFractionDigits: 2,
                      }
                    )} ${symbol}`
              : "-"}
          </div>
        </div>
        <div className="flex flex-col items-center leading-tight">
          <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
            Earnings
          </div>
          <div className="text-[#1E4775] font-medium text-xs font-mono">
                {combinedRewardsUSD > 0
                  ? `$${combinedRewardsUSD.toFixed(2)}`
                  : "-"}
          </div>
        </div>
        <div className="flex flex-col items-center leading-tight">
          <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
            Rewards
          </div>
          <div className="mt-0.5 flex items-center justify-center">
            <RewardTokensDisplay
              collateralPool={collateralPoolAddress}
              sailPool={sailPoolAddress}
                  poolAddresses={rewardPoolAddresses}
              iconSize={16}
              className="justify-center gap-1"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
      onClick={(e) => e.stopPropagation()}
    >
      {groupHasMaintenance ? (
        <MarketMaintenanceTag />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isConnected) return;
            const enrichedAllMarkets = marketList.map(
              (m) => {
                const marketData = marketsData.find(
                  (md) => md.marketId === m.marketId
                );
                return {
                  marketId: m.marketId,
                  market: {
                    ...m.market,
                    wrappedRate: marketData?.wrappedRate,
                  },
                };
              }
            );
            onOpenManage({
              marketId: marketList[0].marketId,
              market: {
                ...marketList[0].market,
                wrappedRate: marketsData.find(
                  (md) =>
                    md.marketId === marketList[0].marketId
                )?.wrappedRate,
              },
              initialTab: "deposit",
              simpleMode: true,
              bestPoolType: "collateral",
              allMarkets: enrichedAllMarkets,
            });
          }}
          disabled={!isConnected}
          className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
        >
          Manage
        </button>
      )}
    </div>
  </div>

  {/* Desktop layout (>= lg) */}
  <div className={ANCHOR_MARKETS_TABLE_ROW_LG_CLASSNAME}>
    <div className="flex items-center justify-center">
      <NetworkIconCell
        chainName={(marketList[0].market as any).chain?.name || "Ethereum"}
        chainLogo={(marketList[0].market as any).chain?.logo || "icons/eth.png"}
        size={20}
      />
    </div>
    <div className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-center gap-1.5 min-w-0">
            <SimpleTooltip
              label={peggedTokenSymbol || symbol}
            >
          <Image
                src={getLogoPath(
                  peggedTokenSymbol || symbol
                )}
            alt={peggedTokenSymbol || symbol}
            width={20}
            height={20}
            className="flex-shrink-0 cursor-help"
          />
        </SimpleTooltip>
        <span
          className="text-[#1E4775] font-medium text-sm lg:text-base truncate min-w-0"
          title={symbol}
        >
          {symbol}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
        )}
      </div>
    </div>
    <div
      className="flex flex-wrap items-center justify-center gap-1.5 min-w-0 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {allDepositAssets.map((asset) => {
        return (
          <SimpleTooltip
            key={asset.symbol}
            label={
              <div>
                <div className="font-semibold mb-1">
                  {asset.name}
                </div>
                <div className="text-xs opacity-90">
                      Collateral is owned by the market and
                  your position is swapped for{" "}
                      {peggedTokenSymbol || "haTOKENS"}.
                </div>
              </div>
            }
          >
            <Image
              src={getLogoPath(asset.symbol)}
              alt={asset.name}
              width={20}
              height={20}
              className="flex-shrink-0 cursor-help rounded-full"
            />
          </SimpleTooltip>
        );
      })}
      <SimpleTooltip
        label={
          isCollateralOnlyRow ? (
            <div>
              <div className="font-semibold mb-1">
                {isMegaEthRow ? "Collateral only (MegaETH)" : "Collateral only"}
              </div>
              <div className="text-xs opacity-90">
                Deposit accepted collateral assets only.
                No token swap on this chain.
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold mb-1">
                Any Token Supported
              </div>
              <div className="text-xs opacity-90 space-y-2">
                {directlyZappableAssets.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">
                      Direct zap (no slippage):
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                          {directlyZappableAssets.map(
                            (asset) => (
                        <div
                          key={asset.symbol}
                          className="flex items-center gap-1"
                        >
                          <Image
                                  src={getLogoPath(
                                    asset.symbol
                                  )}
                            alt={asset.name}
                            width={16}
                            height={16}
                            className="flex-shrink-0 rounded-full"
                          />
                          <span>{asset.symbol}</span>
                        </div>
                            )
                          )}
                    </div>
                  </div>
                )}
                <div>
                  Other ERC20 tokens can be deposited via
                      ParaSwap and will be automatically
                      swapped to {collateralSymbol}.
                </div>
              </div>
            </div>
          )
        }
      >
        <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-help whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
          {!isCollateralOnlyRow && <ArrowPathIcon className="w-3 h-3" />}
          <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
        </div>
      </SimpleTooltip>
    </div>
    <div
      className="text-center min-w-0"
      onClick={(e) => e.stopPropagation()}
    >
      <SimpleTooltip
        label={
          <div className="text-left">
            <div className="font-semibold mb-1">
              APR by Pool
            </div>
            {showLiveAprLoading ? (
                  <div className="text-xs">
                    Loading live APRs…
                  </div>
            ) : projectedAPR.hasRewardsNoTVL ? (
              <div className="text-xs space-y-2">
                <div className="bg-green-500/20 border border-green-500/30 px-2 py-1">
                  <span className="font-semibold text-green-400">
                    Rewards waiting!
                  </span>
                  <div className="mt-1 text-green-300">
                        No deposits yet - first depositors
                        will receive maximum APR
                  </div>
                </div>
                <div className="space-y-1">
                  {projectedAPR.collateralRewards7Day !==
                    null &&
                    projectedAPR.collateralRewards7Day >
                      0n && (
                      <div>
                            • Collateral Pool:{" "}
                        {(
                          Number(
                            projectedAPR.collateralRewards7Day
                          ) / 1e18
                            ).toFixed(4)}{" "}
                        wstETH streaming over 7 days
                      </div>
                    )}
                  {projectedAPR.leveragedRewards7Day !==
                    null &&
                    projectedAPR.leveragedRewards7Day >
                      0n && (
                      <div>
                            • Sail Pool:{" "}
                        {(
                          Number(
                            projectedAPR.leveragedRewards7Day
                          ) / 1e18
                            ).toFixed(4)}{" "}
                        wstETH streaming over 7 days
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-1">
                {/* Collateral Pool APR with reward tokens - aggregate across all markets */}
                {(() => {
                  // Collect all reward token APRs from all collateral pools in the group
                  const allCollateralRewardTokenAPRs: Array<{
                    symbol: string;
                    apr: number;
                  }> = [];

                  marketList.forEach(({ market }) => {
                        const poolAddress = (market as any)
                          ?.addresses
                          ?.stabilityPoolCollateral as
                          | `0x${string}`
                          | undefined;
                    if (poolAddress) {
                          const poolReward =
                            poolRewardsMap.get(poolAddress);
                      if (poolReward?.rewardTokenAPRs) {
                            allCollateralRewardTokenAPRs.push(
                              ...poolReward.rewardTokenAPRs
                            );
                      }
                    }
                  });

                      if (
                        allCollateralRewardTokenAPRs.length ===
                        0
                      ) {
                    return (
                      <div>
                            <div className="font-semibold">
                              • Collateral Pool:
                            </div>
                        <div className="ml-2 mt-0.5">
                          {showLiveAprLoading
                            ? "Loading"
                                : collateralPoolAPRMin !==
                                    null &&
                                  collateralPoolAPRMax !==
                                    null
                            ? collateralPoolAPRMin ===
                              collateralPoolAPRMax
                                  ? `${collateralPoolAPRMin.toFixed(
                                      2
                                    )}%`
                                  : `${collateralPoolAPRMin.toFixed(
                                      2
                                    )}% - ${collateralPoolAPRMax.toFixed(
                                      2
                                    )}%`
                            : "-"}
                        </div>
                      </div>
                    );
                  }

                  // Group by symbol and get min/max APR per token
                      const tokenAPRMap = new Map<
                        string,
                        { min: number; max: number }
                      >();
                      allCollateralRewardTokenAPRs.forEach(
                        ({ symbol, apr }) => {
                    if (!tokenAPRMap.has(symbol)) {
                            tokenAPRMap.set(symbol, {
                              min: apr,
                              max: apr,
                            });
                    } else {
                            const existing =
                              tokenAPRMap.get(symbol)!;
                      tokenAPRMap.set(symbol, {
                              min: Math.min(
                                existing.min,
                                apr
                              ),
                              max: Math.max(
                                existing.max,
                                apr
                              ),
                      });
                    }
                        }
                      );

                      const uniqueTokens = Array.from(
                        tokenAPRMap.entries()
                      ).map(([symbol, { min, max }]) => ({
                    symbol,
                    min,
                    max,
                    avg: (min + max) / 2,
                  }));

                  // Sort by average APR to show lowest first
                      uniqueTokens.sort(
                        (a, b) => a.avg - b.avg
                      );

                  // Always show only MIN and MAX across all tokens
                      const allAPRs = uniqueTokens.flatMap(
                        (t) => [t.min, t.max]
                      );
                      const globalMin = Math.min(
                        ...allAPRs
                      );
                      const globalMax = Math.max(
                        ...allAPRs
                      );

                  // Find which tokens correspond to min and max
                      const minToken =
                        uniqueTokens.find(
                          (t) =>
                            t.min === globalMin ||
                            t.max === globalMin
                        ) || uniqueTokens[0];
                      const maxToken =
                        uniqueTokens.find(
                          (t) =>
                            t.min === globalMax ||
                            t.max === globalMax
                        ) ||
                        uniqueTokens[
                          uniqueTokens.length - 1
                        ];

                  if (uniqueTokens.length === 1) {
                    const token = uniqueTokens[0];
                    return (
                      <div>
                            <div className="font-semibold">
                              • Collateral Pool:
                            </div>
                        <div className="ml-2 mt-0.5">
                          {token.min === token.max
                            ? `${token.min.toFixed(2)}%`
                                : `${token.min.toFixed(
                                    2
                                  )}% - ${token.max.toFixed(
                                    2
                                  )}%`}{" "}
                              ({token.symbol})
                        </div>
                      </div>
                    );
                  }

                  // Multiple tokens - show only MIN and MAX
                  return (
                    <div>
                          <div className="font-semibold">
                            • Collateral Pool:
                          </div>
                      <div className="ml-2 mt-0.5">
                            {globalMin.toFixed(2)}% (
                            {minToken.symbol}) -{" "}
                            {globalMax.toFixed(2)}% (
                            {maxToken.symbol})
                      </div>
                    </div>
                  );
                })()}

                {/* Sail Pool APR with reward tokens - aggregate across all markets */}
                {(() => {
                  // Collect all reward token APRs from all sail pools in the group
                  const allSailRewardTokenAPRs: Array<{
                    symbol: string;
                    apr: number;
                  }> = [];

                  marketList.forEach(({ market }) => {
                        const poolAddress = (market as any)
                          ?.addresses
                          ?.stabilityPoolLeveraged as
                          | `0x${string}`
                          | undefined;
                    if (poolAddress) {
                          const poolReward =
                            poolRewardsMap.get(poolAddress);
                      if (poolReward?.rewardTokenAPRs) {
                            allSailRewardTokenAPRs.push(
                              ...poolReward.rewardTokenAPRs
                            );
                      }
                    }
                  });

                      if (
                        allSailRewardTokenAPRs.length === 0
                      ) {
                    return (
                      <div>
                            <div className="font-semibold">
                              • Sail Pool:
                            </div>
                        <div className="ml-2 mt-0.5">
                          {showLiveAprLoading
                            ? "Loading"
                            : sailPoolAPRMin !== null &&
                              sailPoolAPRMax !== null
                                ? sailPoolAPRMin ===
                                  sailPoolAPRMax
                                  ? `${sailPoolAPRMin.toFixed(
                                      2
                                    )}%`
                                  : `${sailPoolAPRMin.toFixed(
                                      2
                                    )}% - ${sailPoolAPRMax.toFixed(
                                      2
                                    )}%`
                            : "-"}
                        </div>
                      </div>
                    );
                  }

                  // Group by symbol and get min/max APR per token
                      const tokenAPRMap = new Map<
                        string,
                        { min: number; max: number }
                      >();
                      allSailRewardTokenAPRs.forEach(
                        ({ symbol, apr }) => {
                    if (!tokenAPRMap.has(symbol)) {
                            tokenAPRMap.set(symbol, {
                              min: apr,
                              max: apr,
                            });
                    } else {
                            const existing =
                              tokenAPRMap.get(symbol)!;
                      tokenAPRMap.set(symbol, {
                              min: Math.min(
                                existing.min,
                                apr
                              ),
                              max: Math.max(
                                existing.max,
                                apr
                              ),
                      });
                    }
                        }
                      );

                      const uniqueTokens = Array.from(
                        tokenAPRMap.entries()
                      ).map(([symbol, { min, max }]) => ({
                    symbol,
                    min,
                    max,
                    avg: (min + max) / 2,
                  }));

                  // Sort by average APR to show lowest first
                      uniqueTokens.sort(
                        (a, b) => a.avg - b.avg
                      );

                  // Always show only MIN and MAX across all tokens
                      const allAPRs = uniqueTokens.flatMap(
                        (t) => [t.min, t.max]
                      );
                      const globalMin = Math.min(
                        ...allAPRs
                      );
                      const globalMax = Math.max(
                        ...allAPRs
                      );

                  // Find which tokens correspond to min and max
                      const minToken =
                        uniqueTokens.find(
                          (t) =>
                            t.min === globalMin ||
                            t.max === globalMin
                        ) || uniqueTokens[0];
                      const maxToken =
                        uniqueTokens.find(
                          (t) =>
                            t.min === globalMax ||
                            t.max === globalMax
                        ) ||
                        uniqueTokens[
                          uniqueTokens.length - 1
                        ];

                  if (uniqueTokens.length === 1) {
                    const token = uniqueTokens[0];
                    return (
                      <div>
                            <div className="font-semibold">
                              • Sail Pool:
                            </div>
                        <div className="ml-2 mt-0.5">
                          {token.min === token.max
                            ? `${token.min.toFixed(2)}%`
                                : `${token.min.toFixed(
                                    2
                                  )}% - ${token.max.toFixed(
                                    2
                                  )}%`}{" "}
                              ({token.symbol})
                        </div>
                      </div>
                    );
                  }

                  // Multiple tokens - show only MIN and MAX
                  return (
                    <div>
                          <div className="font-semibold">
                            • Sail Pool:
                          </div>
                      <div className="ml-2 mt-0.5">
                            {globalMin.toFixed(2)}% (
                            {minToken.symbol}) -{" "}
                            {globalMax.toFixed(2)}% (
                            {maxToken.symbol})
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Only show Projected APR if we don't have LIVE APRs (and live APRs are not loading) */}
            {!showLiveAprLoading &&
              !isErrorAllRewards &&
              !projectedAPR.hasRewardsNoTVL &&
                  minAPR === 0 &&
                  maxAPR === 0 &&
                  (projectedAPR.collateralPoolAPR !==
                    null ||
                    projectedAPR.leveragedPoolAPR !==
                      null) && (
                <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
                  <div className="font-semibold mb-1">
                    Projected APR (next 7 days)
                  </div>
                  <div className="space-y-1">
                    <div>
                          • Collateral Pool:{" "}
                      {projectedAPR.collateralPoolAPR !==
                      null
                        ? `${projectedAPR.collateralPoolAPR.toFixed(
                            2
                          )}%`
                        : "-"}
                    </div>
                    <div>
                          • Sail Pool:{" "}
                      {projectedAPR.leveragedPoolAPR !==
                      null
                        ? `${projectedAPR.leveragedPoolAPR.toFixed(
                            2
                          )}%`
                        : "-"}
                    </div>
                  </div>
                  {projectedAPR.harvestableAmount !==
                    null &&
                        projectedAPR.harvestableAmount >
                          0n && (
                      <div className="mt-1 text-xs opacity-80">
                            Based on{" "}
                        {(
                          Number(
                            projectedAPR.harvestableAmount
                          ) / 1e18
                            ).toFixed(4)}{" "}
                        wstETH harvestable.
                        {projectedAPR.remainingDays !==
                          null &&
                          ` ~${projectedAPR.remainingDays.toFixed(
                            1
                          )} days until harvest.`}
                      </div>
                    )}
                </div>
              )}
          </div>
        }
      >
        <span
          className={`font-medium text-xs font-mono cursor-help ${
            projectedAPR.hasRewardsNoTVL
              ? "text-green-600 font-bold"
              : "text-[#1E4775]"
          }`}
        >
          {(() => {
            if (showLiveAprLoading) {
              return "Loading";
            }
            // Special case: rewards waiting with no TVL
            if (projectedAPR.hasRewardsNoTVL) {
              return "10k%+";
            }

                const hasCurrentAPR =
                  minAPR > 0 || maxAPR > 0;
            const hasProjectedAPR =
              (minProjectedAPR !== null &&
                minProjectedAPR > 0) ||
              (maxProjectedAPR !== null &&
                maxProjectedAPR > 0);

            const formatRange = (
              min: number,
              max: number
            ): string => {
              if (min > 0 && min !== max) {
                    return `${min.toFixed(
                  1
                    )}% - ${max.toFixed(1)}%`;
              }
              return `${max.toFixed(1)}%`;
            };

            const currentStr = hasCurrentAPR
              ? formatRange(minAPR, maxAPR)
              : "";

            const projMin =
              minProjectedAPR !== null
                ? minProjectedAPR
                : maxProjectedAPR ?? 0;
            const projMax =
              maxProjectedAPR !== null
                ? maxProjectedAPR
                : minProjectedAPR ?? 0;
            const projectedStr = hasProjectedAPR
              ? formatRange(projMin, projMax)
              : "";

            if (!hasCurrentAPR && !hasProjectedAPR) {
              return "-";
            }

            if (!hasCurrentAPR && hasProjectedAPR) {
                  return projectedStr
                    ? `Proj\n${projectedStr}`
                    : "-";
              }

            // Don't show projected APR if we have LIVE APRs
            if (hasCurrentAPR) {
              return currentStr || "-";
            }

            return currentStr || "-";
          })()}
        </span>
      </SimpleTooltip>
    </div>
    <div
      className="text-center min-w-0"
      onClick={(e) => e.stopPropagation()}
    >
          <div className="text-[#1E4775] font-medium text-xs font-mono">
        {combinedRewardsUSD > 0
          ? `$${combinedRewardsUSD.toFixed(2)}`
          : "-"}
      </div>
    </div>
    <RewardTokensDisplay
      collateralPool={collateralPoolAddress}
      sailPool={sailPoolAddress}
          poolAddresses={rewardPoolAddresses}
    />
    <div className="text-center min-w-0">
      <span className="text-[#1E4775] font-medium text-xs font-mono">
        {combinedPositionUSD > 0
          ? formatCompactUSD(combinedPositionUSD)
          : combinedPositionTokens > 0
          ? `${combinedPositionTokens.toLocaleString(
              undefined,
              { maximumFractionDigits: 2 }
            )} ${symbol}`
          : "-"}
      </span>
    </div>
    <div
      className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
      onClick={(e) => e.stopPropagation()}
    >
      {groupHasMaintenance ? (
        <MarketMaintenanceTag />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Find the wrappedRate from marketsData for each market
            const enrichedAllMarkets = marketList.map(
              (m) => {
                const marketData = marketsData.find(
                  (md) => md.marketId === m.marketId
                );
                return {
                  marketId: m.marketId,
                  market: {
                    ...m.market,
                    wrappedRate: marketData?.wrappedRate,
                  },
                };
              }
            );

            onOpenManage({
              marketId: marketList[0].marketId,
              market: {
                ...marketList[0].market,
                wrappedRate: marketsData.find(
                  (md) =>
                    md.marketId === marketList[0].marketId
                )?.wrappedRate,
              },
              initialTab: "deposit",
              simpleMode: true,
              bestPoolType: "collateral",
              allMarkets: enrichedAllMarkets,
            });
          }}
          className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
        >
          Manage
        </button>
      )}
    </div>
  </div>
</div>

  );
}

export const AnchorMarketGroupCollapsedRow = React.memo(
  AnchorMarketGroupCollapsedRowInner
);
