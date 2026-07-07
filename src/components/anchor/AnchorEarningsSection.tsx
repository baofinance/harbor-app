"use client";

import React from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { RewardTokensDisplay } from "@/components/anchor/RewardTokensDisplay";
import { formatCompactUSD, formatAPR } from "@/utils/anchor";
import { formatToken } from "@/utils/formatters";
import { INDEX_EARN_CLAIM_BUTTON_CLASS_COMPACT } from "@/utils/indexPageManageButton";
import type { AnchorContractReads, AnchorMarketTuple } from "@/types/anchor";

export type AnchorEarningsSectionProps = {
  anchorMarkets: AnchorMarketTuple[];
  reads: AnchorContractReads;
  poolRewardsMap: Map<`0x${string}`, any>;
  allMarketsData: any[];
  marketPositions: Record<string, any>;
  isEarningsExpanded: boolean;
  setIsEarningsExpanded: (v: boolean) => void;
  isClaimingAll: boolean;
  handleClaimRewards: (market: any, poolType: "collateral" | "sail") => Promise<void>;
  handleCompoundRewards: (market: any, poolType: "collateral" | "sail", rewardAmount: bigint) => void;
  createCompoundHandlers: (...args: any[]) => any;
  setCompoundModal: (v: any) => void;
};

export function AnchorEarningsSection(props: AnchorEarningsSectionProps) {
  const {
    anchorMarkets,
    reads,
    poolRewardsMap,
    allMarketsData,
    marketPositions,
    isEarningsExpanded,
    setIsEarningsExpanded,
    isClaimingAll,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    setCompoundModal,
  } = props;

// Calculate totals across all markets
            let totalCollateralRewards = 0n;
            let totalSailRewards = 0n;
            let totalCollateralRewardsUSD = 0;
            let totalSailRewardsUSD = 0;
            let totalAPR = 0;
            let aprCount = 0;
            let totalDepositUSD = 0;

            anchorMarkets.forEach(([id, m], mi) => {
              const hasCollateralPool = !!(m as any).addresses
                ?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses
                ?.stabilityPoolLeveraged;

              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses
                  ?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses
                  ?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses
                  ?.collateralPrice;
                const prevHasStabilityPoolManager = !!(prevMarket as any)
                  .addresses?.stabilityPoolManager;
                offset += 5; // 4 minter calls + 1 config call
                if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
                if (prevHasCollateral) offset += 4;
                if (prevHasSail) offset += 4;
                if (prevHasPriceOracle) offset += 1;
              }

              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                | bigint
                | undefined;

              let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
              let collateralPoolRewards: bigint | undefined;
              let collateralPoolAPR:
                | { collateral: number; steam: number }
                | undefined;
              let sailPoolRewards: bigint | undefined;
              let sailPoolAPR:
                | { collateral: number; steam: number }
                | undefined;

              if (hasCollateralPool) {
                const collateralAPRResult = reads?.[currentOffset + 1]
                  ?.result as [bigint, bigint] | undefined;
                collateralPoolAPR = collateralAPRResult
                  ? {
                      collateral: (Number(collateralAPRResult[0]) / 1e16) * 100,
                      steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
                    }
                  : undefined;
                // Note: We'll update APR later using aggregated rewards from all tokens
                currentOffset += 4;
              }

              if (hasSailPool) {
                const sailAPRResult = reads?.[currentOffset + 1]?.result as
                  | [bigint, bigint]
                  | undefined;
                sailPoolAPR = sailAPRResult
                  ? {
                      collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
                      steam: (Number(sailAPRResult[1]) / 1e16) * 100,
                    }
                  : undefined;
                // Note: We'll update APR later using aggregated rewards from all tokens
                currentOffset += 4;
              }

              // Get price oracle for USD calculations
              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              const collateralPriceDecimals = 18;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                const latestAnswerResult = reads?.[currentOffset]?.result;
                if (
                  latestAnswerResult !== undefined &&
                  latestAnswerResult !== null
                ) {
                  if (Array.isArray(latestAnswerResult)) {
                    collateralPrice = latestAnswerResult[1] as bigint;
                  } else if (typeof latestAnswerResult === "object") {
                    const obj = latestAnswerResult as {
                      maxUnderlyingPrice?: bigint;
                    };
                    collateralPrice = obj.maxUnderlyingPrice;
                  } else if (typeof latestAnswerResult === "bigint") {
                    collateralPrice = latestAnswerResult;
                  }
                }
              }

              // Calculate USD values using aggregated rewards from all reward tokens
              const collateralPoolAddress = hasCollateralPool
                ? ((m as any).addresses?.stabilityPoolCollateral as
                    | `0x${string}`
                    | undefined)
                : undefined;
              const sailPoolAddress = hasSailPool
                ? ((m as any).addresses?.stabilityPoolLeveraged as
                    | `0x${string}`
                    | undefined)
                : undefined;

              // Use aggregated rewards from useAllStabilityPoolRewards (includes all reward tokens)
              if (collateralPoolAddress) {
                const poolReward = poolRewardsMap.get(collateralPoolAddress);
                if (poolReward && poolReward.claimableValue > 0) {
                  totalCollateralRewardsUSD += poolReward.claimableValue;
                }
                // Also update APR to include all reward tokens
                if (
                  poolReward?.totalRewardAPR &&
                  poolReward.totalRewardAPR > 0
                ) {
                  // Replace the APR from contract with the aggregated APR from all reward tokens
                  if (collateralPoolAPR) {
                    // Add additional APR from other reward tokens (subtract contract APR to avoid double-counting)
                    const contractAPR =
                      (collateralPoolAPR.collateral || 0) +
                      (collateralPoolAPR.steam || 0);
                    const additionalAPR =
                      poolReward.totalRewardAPR - contractAPR;
                    if (additionalAPR > 0) {
                      collateralPoolAPR = {
                        collateral:
                          (collateralPoolAPR.collateral || 0) + additionalAPR,
                        steam: collateralPoolAPR.steam || 0,
                      };
                    } else {
                      // If total reward APR is higher, use it instead
                      collateralPoolAPR = {
                        collateral: poolReward.totalRewardAPR,
                        steam: 0,
                      };
                    }
                  } else {
                    // If no contract APR, use the total reward APR
                    collateralPoolAPR = {
                      collateral: poolReward.totalRewardAPR,
                      steam: 0,
                    };
                  }
                }
              }

              if (sailPoolAddress) {
                const poolReward = poolRewardsMap.get(sailPoolAddress);
                if (poolReward && poolReward.claimableValue > 0) {
                  totalSailRewardsUSD += poolReward.claimableValue;
                }
                // Also update APR to include all reward tokens
                if (
                  poolReward?.totalRewardAPR &&
                  poolReward.totalRewardAPR > 0
                ) {
                  // Replace the APR from contract with the aggregated APR from all reward tokens
                  if (sailPoolAPR) {
                    // Add additional APR from other reward tokens (subtract contract APR to avoid double-counting)
                    const contractAPR =
                      (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0);
                    const additionalAPR =
                      poolReward.totalRewardAPR - contractAPR;
                    if (additionalAPR > 0) {
                      sailPoolAPR = {
                        collateral:
                          (sailPoolAPR.collateral || 0) + additionalAPR,
                        steam: sailPoolAPR.steam || 0,
                      };
                    } else {
                      // If total reward APR is higher, use it instead
                      sailPoolAPR = {
                        collateral: poolReward.totalRewardAPR,
                        steam: 0,
                      };
                    }
                  } else {
                    // If no contract APR, use the total reward APR
                    sailPoolAPR = {
                      collateral: poolReward.totalRewardAPR,
                      steam: 0,
                    };
                  }
                }
              }

              // Calculate total deposit USD for earnings calculation using hook data
              const positionData = marketPositions[id];
              if (positionData?.walletHaUSD) {
                totalDepositUSD += positionData.walletHaUSD;
              }

              // Update total APR after we've updated the APR values with all reward tokens
              if (collateralPoolAPR) {
                totalAPR +=
                  (collateralPoolAPR.collateral || 0) +
                  (collateralPoolAPR.steam || 0);
                aprCount++;
              }
              if (sailPoolAPR) {
                totalAPR +=
                  (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0);
                aprCount++;
              }
            });

            const totalRewardsUSD =
              totalCollateralRewardsUSD + totalSailRewardsUSD;
            const averageAPR = aprCount > 0 ? totalAPR / aprCount : 0;

            // Collect markets with deposits and rewards
            const marketsWithRewards: Array<{
              market: any;
              marketId: string;
              userDeposit: bigint;
              userDepositUSD: number;
              collateralRewards: bigint;
              collateralRewardsUSD: number;
              sailRewards: bigint;
              sailRewardsUSD: number;
              collateralSymbol: string;
              sailSymbol: string;
              hasCollateralPool: boolean;
              hasSailPool: boolean;
            }> = [];

            anchorMarkets.forEach(([id, m], mi) => {
              const hasCollateralPool = !!(m as any).addresses
                ?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses
                ?.stabilityPoolLeveraged;
              const positionData = marketPositions[id];
              const userDeposit = positionData?.walletHa || 0n;

              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses
                  ?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses
                  ?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses
                  ?.collateralPrice;
                offset += 4;
                if (prevHasCollateral) offset += 3;
                if (prevHasSail) offset += 3;
                if (prevHasPriceOracle) offset += 1;
              }

              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                | bigint
                | undefined;

              let currentOffset = baseOffset + 4;
              let collateralPoolRewards: bigint | undefined;
              let sailPoolRewards: bigint | undefined;

              if (hasCollateralPool) {
                collateralPoolRewards = reads?.[currentOffset + 2]?.result as
                  | bigint
                  | undefined;
                currentOffset += 3;
              }

              if (hasSailPool) {
                sailPoolRewards = reads?.[currentOffset + 2]?.result as
                  | bigint
                  | undefined;
                currentOffset += 3;
              }

              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              const collateralPriceDecimals = 18;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                const latestAnswerResult = reads?.[currentOffset]?.result;
                if (
                  latestAnswerResult !== undefined &&
                  latestAnswerResult !== null
                ) {
                  if (Array.isArray(latestAnswerResult)) {
                    collateralPrice = latestAnswerResult[1] as bigint;
                  } else if (typeof latestAnswerResult === "object") {
                    const obj = latestAnswerResult as {
                      maxUnderlyingPrice?: bigint;
                    };
                    collateralPrice = obj.maxUnderlyingPrice;
                  } else if (typeof latestAnswerResult === "bigint") {
                    collateralPrice = latestAnswerResult;
                  }
                }
              }

              let collateralRewardsUSD = 0;
              let sailRewardsUSD = 0;

              // getClaimableRewards returns rewards in pegged token (ha token)
              // So we use peggedTokenPrice for USD calculation
              if (
                collateralPoolRewards &&
                collateralPoolRewards > 0n &&
                peggedTokenPrice
              ) {
                const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                const rewardsAmount = Number(collateralPoolRewards) / 1e18;
                collateralRewardsUSD = rewardsAmount * peggedPriceUSD;
              }

              if (sailPoolRewards && sailPoolRewards > 0n && peggedTokenPrice) {
                const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                const rewardsAmount = Number(sailPoolRewards) / 1e18;
                sailRewardsUSD = rewardsAmount * peggedPriceUSD;
              }

              const totalMarketRewardsUSD =
                collateralRewardsUSD + sailRewardsUSD;

              // Calculate user deposit USD for sorting
              let userDepositUSD = 0;
              if (
                userDeposit &&
                userDeposit > 0n &&
                peggedTokenPrice &&
                collateralPrice &&
                collateralPriceDecimals !== undefined
              ) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum =
                  Number(collateralPrice) /
                  10 ** (Number(collateralPriceDecimals) || 8);
                const depositAmount = Number(userDeposit) / 1e18;
                userDepositUSD =
                  depositAmount * (peggedPrice * collateralPriceNum);
              }

              // Include all markets (for dropdown), even if no deposits or rewards
              marketsWithRewards.push({
                market: m,
                marketId: id,
                userDeposit: userDeposit,
                userDepositUSD,
                collateralRewards: collateralPoolRewards || 0n,
                collateralRewardsUSD,
                sailRewards: sailPoolRewards || 0n,
                sailRewardsUSD,
                collateralSymbol: m.collateral?.symbol || "ETH",
                sailSymbol: m.leveragedToken?.symbol || "hs",
                hasCollateralPool,
                hasSailPool,
              });
            });

            // Sort markets by deposit amount (descending)
            const sortedMarketsWithRewards = [...marketsWithRewards].sort(
              (a, b) => b.userDepositUSD - a.userDepositUSD
            );

            return (
              <>
                {/* Expanded View */}
                {isEarningsExpanded && marketsWithRewards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1E4775]/20 space-y-2">
                    {marketsWithRewards
                      .filter(
                        ({
                          collateralRewards,
                          sailRewards,
                          collateralRewardsUSD,
                          sailRewardsUSD,
                        }) => {
                          const totalMarketRewardsUSD =
                            collateralRewardsUSD + sailRewardsUSD;
                          return (
                            totalMarketRewardsUSD > 0 ||
                            (collateralRewards && collateralRewards > 0n) ||
                            (sailRewards && sailRewards > 0n)
                          );
                        }
                      )
                      .map(
                        ({
                          market,
                          marketId,
                          collateralRewards,
                          collateralRewardsUSD,
                          sailRewards,
                          sailRewardsUSD,
                          collateralSymbol,
                          sailSymbol,
                        }) => {
                          const marketTotalUSD =
                            collateralRewardsUSD + sailRewardsUSD;
                          const hasCollateral = collateralRewards > 0n;
                          const hasSail = sailRewards > 0n;

                          return (
                            <div
                              key={marketId}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex-1">
                                <div className="text-[#1E4775] font-medium">
                                  {market.peggedToken?.symbol || marketId}
                                </div>
                                <div className="text-[#1E4775]/70">
                                  ${marketTotalUSD.toFixed(2)}
                                  {hasCollateral && (
                                    <span className="ml-2">
                                      {formatToken(collateralRewards)}{" "}
                                      {collateralSymbol}
                                    </span>
                                  )}
                                  {hasSail && (
                                    <span className="ml-2">
                                      {formatToken(sailRewards)} {sailSymbol}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasCollateral) {
                                    handleClaimRewards(market, "collateral");
                                  }
                                  if (hasSail) {
                                    handleClaimRewards(market, "sail");
                                  }
                                }}
                                disabled={isClaimingAll || marketTotalUSD === 0}
                                className={INDEX_EARN_CLAIM_BUTTON_CLASS_COMPACT}
                              >
                                Claim
                              </button>
                            </div>
                          );
                        }
                      )}
                  </div>
                )}
              </>
            );
}
