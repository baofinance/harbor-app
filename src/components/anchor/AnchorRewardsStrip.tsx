"use client";

import React from "react";
import Image from "next/image";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { RewardTokensDisplay } from "@/components/anchor/RewardTokensDisplay";
import {
  AnchorVaprTooltipContent,
  type AnchorVaprPositionApr,
} from "@/components/anchor/AnchorVaprTooltipContent";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_GRID_6_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";
import {
  INDEX_MANAGE_BUTTON_CLASS_DESKTOP,
  INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL,
} from "@/utils/indexPageManageButton";

const ANCHOR_MARKS_ENABLED = true;
import {
  ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME,
  ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME,
} from "@/components/anchor/anchorMarketsTableGrid";
import { formatCompactUSD, formatAPR } from "@/utils/anchor";
import { formatToken } from "@/utils/formatters";
import { TokenLogo, getLogoPath } from "@/components/shared";
import NetworkIconCell from "@/components/NetworkIconCell";
import type { AnchorContractReads, AnchorMarketTuple } from "@/types/anchor";

export type AnchorRewardsStripProps = {
  anchorMarkets: AnchorMarketTuple[];
  reads: AnchorContractReads;
  isConnected: boolean;
  address?: `0x${string}`;
  marketPositions: Record<string, any>;
  poolRewardsMap: Map<`0x${string}`, any>;
  allMarketsData: any[];
  totalAnchorMarks: number;
  totalAnchorMarksPerDay: number;
  totalMarksPerDay: number;
  sailMarksPerDay: number;
  maidenVoyageMarksPerDay: number;
  isLoadingAnchorMarks: boolean;
  showLiveAprLoading: boolean;
  isErrorAllRewards: boolean;
  projectedAPR: Parameters<typeof AnchorVaprTooltipContent>[0]["projectedAPR"];
  mounted: boolean;
  isLoadingLedgerMarks: boolean;
  totalAnchorLedgerMarks: number;
  totalAnchorLedgerMarksPerDay: number;
  isClaimingAll: boolean;
  isCompoundingAll: boolean;
  onClaimAll: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  selectedMarketForClaim: string | null;
  setSelectedMarketForClaim: (v: string | null) => void;
  setIsClaimMarketModalOpen: (v: boolean) => void;
};

export function AnchorRewardsStrip(props: AnchorRewardsStripProps) {
  const {
    anchorMarkets,
    reads,
    isConnected,
    address,
    marketPositions,
    poolRewardsMap,
    allMarketsData,
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay,
    isLoadingAnchorMarks,
    showLiveAprLoading,
    isErrorAllRewards,
    projectedAPR,
    mounted,
    isLoadingLedgerMarks,
    totalAnchorLedgerMarks,
    totalAnchorLedgerMarksPerDay,
    isClaimingAll,
    isCompoundingAll,
    onClaimAll,
    dropdownRef,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedMarketForClaim,
    setSelectedMarketForClaim,
    setIsClaimMarketModalOpen,
  } = props;

// Calculate total rewards for the bar
            let totalRewardsForBar = 0;
            let totalPositionForBar = 0;
            // For blended APR calculation
            let totalWeightedAPR = 0; // Sum of (depositUSD * APR)
            let totalDepositUSD = 0; // Sum of depositUSD
            // Total stability pool deposits (USD). Excludes wallet balances.
            let totalStabilityPoolDepositsUSD = 0;
            // Track individual positions for tooltip
            const positionAPRs: AnchorVaprPositionApr[] = [];

            if (reads) {
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
                  const prevPeggedTokenAddress = (prevMarket as any)?.addresses
                    ?.peggedToken;
                  offset += 5; // 4 minter calls + 1 config call
                  if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
                  if (prevHasCollateral) {
                    offset += 4; // 4 pool reads
                    if (prevPeggedTokenAddress) offset += 1; // rewardData
                  }
                  if (prevHasSail) {
                    offset += 4; // 4 pool reads
                    if (prevPeggedTokenAddress) offset += 1; // rewardData
                  }
                  if (prevHasPriceOracle) offset += 1;
                }

                const baseOffset = offset;
                const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                  | bigint
                  | undefined;

                // Account for rebalanceThreshold if current market has stabilityPoolManager
                const hasStabilityPoolManager = !!(m as any).addresses
                  ?.stabilityPoolManager;
                const currentPeggedTokenAddress = (m as any).addresses
                  ?.peggedToken;
                let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
                if (hasStabilityPoolManager) currentOffset += 1; // rebalanceThreshold

                let collateralPoolRewards: bigint | undefined;
                let sailPoolRewards: bigint | undefined;
                let collateralPoolDeposit: bigint | undefined;
                let sailPoolDeposit: bigint | undefined;
                let collateralPoolAPR:
                  | { collateral: number; steam: number }
                  | undefined;
                let sailPoolAPR:
                  | { collateral: number; steam: number }
                  | undefined;

                if (hasCollateralPool) {
                  const collateralPoolTVL = reads?.[currentOffset]?.result as
                    | bigint
                    | undefined;
                  const collateralAPRResult = reads?.[currentOffset + 1]
                    ?.result as [bigint, bigint] | undefined;
                  collateralPoolAPR = collateralAPRResult
                    ? {
                        collateral:
                          (Number(collateralAPRResult[0]) / 1e16) * 100,
                        steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
                      }
                    : undefined;
                  const collateralRewardsRead = reads?.[currentOffset + 2];
                  collateralPoolRewards =
                    collateralRewardsRead?.status === "success" &&
                    collateralRewardsRead.result !== undefined &&
                    collateralRewardsRead.result !== null
                      ? (collateralRewardsRead.result as bigint)
                      : undefined;

                  const collateralDepositRead = reads?.[currentOffset + 3];
                  if (
                    collateralDepositRead?.status === "success" &&
                    collateralDepositRead.result !== undefined &&
                    collateralDepositRead.result !== null
                  ) {
                    collateralPoolDeposit =
                      collateralDepositRead.result as bigint;
                  }

                  // Read reward data for APR fallback calculation
                  const collateralRewardDataRead = currentPeggedTokenAddress
                    ? reads?.[currentOffset + 4]
                    : undefined;
                  const collateralRewardData =
                    collateralRewardDataRead?.status === "success" &&
                    collateralRewardDataRead.result
                      ? (collateralRewardDataRead.result as [
                          bigint,
                          bigint,
                          bigint,
                          bigint
                        ]) // [lastUpdate, finishAt, rate, queued]
                      : undefined;

                  // Calculate APR from reward rate if contract APR is 0 or undefined
                  if (
                    collateralRewardData &&
                    collateralPoolTVL &&
                    collateralPoolTVL > 0n &&
                    peggedTokenPrice
                  ) {
                    const rewardRate = collateralRewardData[2]; // rate
                    if (rewardRate > 0n) {
                      const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                      const ratePerTokenPerSecond =
                        Number(rewardRate) / Number(collateralPoolTVL);
                      const annualRewards =
                        ratePerTokenPerSecond *
                        Number(collateralPoolTVL) *
                        SECONDS_PER_YEAR;

                      const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                      const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for collateral pool
                      const annualRewardsValueUSD =
                        (annualRewards * rewardTokenPrice) / 1e18;
                      const depositValueUSD =
                        (Number(collateralPoolTVL) * depositTokenPrice) / 1e18;

                      if (depositValueUSD > 0) {
                        const calculatedAPR =
                          (annualRewardsValueUSD / depositValueUSD) * 100;

                        // Add to existing APR (don't replace, accumulate)
                        if (calculatedAPR > 0) {
                          if (!collateralPoolAPR) {
                            collateralPoolAPR = {
                              collateral: calculatedAPR,
                              steam: 0,
                            };
                          } else {
                            // Add to existing APR
                            collateralPoolAPR = {
                              collateral:
                                (collateralPoolAPR.collateral || 0) +
                                calculatedAPR,
                              steam: collateralPoolAPR.steam || 0,
                            };
                          }
                        }
                      }
                    }
                  }

                  // Add additional APR from all reward tokens (including wstETH, etc.)
                  const collateralPoolAddress = hasCollateralPool
                    ? ((m as any).addresses?.stabilityPoolCollateral as
                        | `0x${string}`
                        | undefined)
                    : undefined;
                  if (collateralPoolAddress) {
                    const poolReward = poolRewardsMap.get(
                      collateralPoolAddress
                    );
                    if (
                      poolReward?.totalRewardAPR &&
                      poolReward.totalRewardAPR > 0
                    ) {
                      // Add the APR from all reward tokens to the existing APR
                      // We need to subtract the pegged token APR we already added to avoid double-counting
                      const peggedTokenAPR =
                        collateralRewardData && collateralRewardData[2] > 0n
                          ? (() => {
                              const rewardRate = collateralRewardData[2];
                              const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                              const ratePerTokenPerSecond =
                                Number(rewardRate) / Number(collateralPoolTVL);
                              const annualRewards =
                                ratePerTokenPerSecond *
                                Number(collateralPoolTVL) *
                                SECONDS_PER_YEAR;
                              const rewardTokenPrice =
                                Number(peggedTokenPrice) / 1e18;
                              const depositTokenPrice =
                                Number(peggedTokenPrice) / 1e18;
                              const annualRewardsValueUSD =
                                (annualRewards * rewardTokenPrice) / 1e18;
                              const depositValueUSD =
                                (Number(collateralPoolTVL) *
                                  depositTokenPrice) /
                                1e18;
                              return depositValueUSD > 0
                                ? (annualRewardsValueUSD / depositValueUSD) *
                                    100
                                : 0;
                            })()
                          : 0;
                      const additionalAPR =
                        poolReward.totalRewardAPR - peggedTokenAPR;
                      if (additionalAPR > 0) {
                        if (!collateralPoolAPR) {
                          collateralPoolAPR = {
                            collateral: poolReward.totalRewardAPR,
                            steam: 0,
                          };
                        } else {
                          collateralPoolAPR = {
                            collateral:
                              (collateralPoolAPR.collateral || 0) +
                              additionalAPR,
                            steam: collateralPoolAPR.steam || 0,
                          };
                        }
                      } else if (
                        poolReward.totalRewardAPR > 0 &&
                        !collateralPoolAPR
                      ) {
                        // If we don't have pegged token APR but have other reward tokens
                        collateralPoolAPR = {
                          collateral: poolReward.totalRewardAPR,
                          steam: 0,
                        };
                      }
                    }
                  }

                  currentOffset += 4; // 4 pool reads
                  if (currentPeggedTokenAddress) currentOffset += 1; // rewardData
                }

                if (hasSailPool) {
                  const sailPoolTVL = reads?.[currentOffset]?.result as
                    | bigint
                    | undefined;
                  const sailAPRResult = reads?.[currentOffset + 1]?.result as
                    | [bigint, bigint]
                    | undefined;
                  sailPoolAPR = sailAPRResult
                    ? {
                        collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
                        steam: (Number(sailAPRResult[1]) / 1e16) * 100,
                      }
                    : undefined;
                  const sailRewardsRead = reads?.[currentOffset + 2];
                  sailPoolRewards =
                    sailRewardsRead?.status === "success" &&
                    sailRewardsRead.result !== undefined &&
                    sailRewardsRead.result !== null
                      ? (sailRewardsRead.result as bigint)
                      : undefined;

                  const sailDepositRead = reads?.[currentOffset + 3];
                  if (
                    sailDepositRead?.status === "success" &&
                    sailDepositRead.result !== undefined &&
                    sailDepositRead.result !== null
                  ) {
                    sailPoolDeposit = sailDepositRead.result as bigint;
                  }

                  // Read reward data for APR fallback calculation
                  const sailRewardDataRead = currentPeggedTokenAddress
                    ? reads?.[currentOffset + 4]
                    : undefined;
                  const sailRewardData =
                    sailRewardDataRead?.status === "success" &&
                    sailRewardDataRead.result
                      ? (sailRewardDataRead.result as [
                          bigint,
                          bigint,
                          bigint,
                          bigint
                        ]) // [lastUpdate, finishAt, rate, queued]
                      : undefined;

                  // Calculate APR from reward rate if contract APR is 0 or undefined
                  if (
                    sailRewardData &&
                    sailPoolTVL &&
                    sailPoolTVL > 0n &&
                    peggedTokenPrice
                  ) {
                    const rewardRate = sailRewardData[2]; // rate
                    if (rewardRate > 0n) {
                      const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                      const ratePerTokenPerSecond =
                        Number(rewardRate) / Number(sailPoolTVL);
                      const annualRewards =
                        ratePerTokenPerSecond *
                        Number(sailPoolTVL) *
                        SECONDS_PER_YEAR;

                      const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                      const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for sail pool
                      const annualRewardsValueUSD =
                        (annualRewards * rewardTokenPrice) / 1e18;
                      const depositValueUSD =
                        (Number(sailPoolTVL) * depositTokenPrice) / 1e18;

                      if (depositValueUSD > 0) {
                        const calculatedAPR =
                          (annualRewardsValueUSD / depositValueUSD) * 100;

                        // Add to existing APR (don't replace, accumulate)
                        if (calculatedAPR > 0) {
                          if (!sailPoolAPR) {
                            sailPoolAPR = {
                              collateral: calculatedAPR,
                              steam: 0,
                            };
                          } else {
                            // Add to existing APR
                            sailPoolAPR = {
                              collateral:
                                (sailPoolAPR.collateral || 0) + calculatedAPR,
                              steam: sailPoolAPR.steam || 0,
                            };
                          }
                        }
                      }
                    }
                  }

                  // Add additional APR from all reward tokens (including wstETH, etc.)
                  const sailPoolAddress = hasSailPool
                    ? ((m as any).addresses?.stabilityPoolLeveraged as
                        | `0x${string}`
                        | undefined)
                    : undefined;
                  if (sailPoolAddress) {
                    const poolReward = poolRewardsMap.get(sailPoolAddress);
                    if (
                      poolReward?.totalRewardAPR &&
                      poolReward.totalRewardAPR > 0
                    ) {
                      // Add the APR from all reward tokens to the existing APR
                      // We need to subtract the pegged token APR we already added to avoid double-counting
                      // Calculate pegged token APR if we have the data
                      let peggedTokenAPR = 0;
                      if (
                        sailRewardData &&
                        sailRewardData[2] > 0n &&
                        sailPoolTVL &&
                        sailPoolTVL > 0n &&
                        peggedTokenPrice
                      ) {
                        const rewardRate = sailRewardData[2];
                        const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                        const ratePerTokenPerSecond =
                          Number(rewardRate) / Number(sailPoolTVL);
                        const annualRewards =
                          ratePerTokenPerSecond *
                          Number(sailPoolTVL) *
                          SECONDS_PER_YEAR;
                        const rewardTokenPrice =
                          Number(peggedTokenPrice) / 1e18;
                        const depositTokenPrice =
                          Number(peggedTokenPrice) / 1e18;
                        const annualRewardsValueUSD =
                          (annualRewards * rewardTokenPrice) / 1e18;
                        const depositValueUSD =
                          (Number(sailPoolTVL) * depositTokenPrice) / 1e18;
                        if (depositValueUSD > 0) {
                          peggedTokenAPR =
                            (annualRewardsValueUSD / depositValueUSD) * 100;
                        }
                      }
                      const additionalAPR =
                        poolReward.totalRewardAPR - peggedTokenAPR;
                      if (additionalAPR > 0) {
                        if (!sailPoolAPR) {
                          sailPoolAPR = {
                            collateral: poolReward.totalRewardAPR,
                            steam: 0,
                          };
                        } else {
                          sailPoolAPR = {
                            collateral:
                              (sailPoolAPR.collateral || 0) + additionalAPR,
                            steam: sailPoolAPR.steam || 0,
                          };
                        }
                      }
                    }
                  }

                  currentOffset += 4; // 4 pool reads
                  if (currentPeggedTokenAddress) currentOffset += 1; // rewardData
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

                // Get position data from hook (more accurate than contract reads)
                const positionData = marketPositions?.[id];
                const userDeposit = positionData?.walletHa || 0n;
                const collateralPoolDepositUSD =
                  positionData?.collateralPoolUSD || 0;
                const sailPoolDepositUSD = positionData?.sailPoolUSD || 0;

                // Total deposits should reflect *all* stability pool deposits (regardless of APR),
                // and should NOT include wallet balances.
                totalStabilityPoolDepositsUSD +=
                  (collateralPoolDepositUSD || 0) + (sailPoolDepositUSD || 0);

                // Calculate rewards USD from all reward tokens
                // Use the aggregated rewards from useAllStabilityPoolRewards
                if (hasCollateralPool) {
                  const collateralPoolAddress = (m as any).addresses
                    ?.stabilityPoolCollateral as `0x${string}`;
                  const poolReward = poolRewardsMap.get(collateralPoolAddress);
                  if (poolReward && poolReward.claimableValue > 0) {
                    totalRewardsForBar += poolReward.claimableValue;
                  }
                }
                if (hasSailPool) {
                  const sailPoolAddress = (m as any).addresses
                    ?.stabilityPoolLeveraged as `0x${string}`;
                  const poolReward = poolRewardsMap.get(sailPoolAddress);
                  if (poolReward && poolReward.claimableValue > 0) {
                    totalRewardsForBar += poolReward.claimableValue;
                  }
                }

                // Calculate blended APR using position data from hooks and APR from all reward tokens
                // Collateral Pool
                if (hasCollateralPool && collateralPoolDepositUSD > 0) {
                  const collateralPoolAddress = (m as any).addresses
                    ?.stabilityPoolCollateral as `0x${string}`;
                  const poolReward = poolRewardsMap.get(collateralPoolAddress);

                  // Use totalRewardAPR from useAllStabilityPoolRewards (includes all reward tokens)
                  const poolAPR = poolReward?.totalRewardAPR || 0;

                  if (poolAPR > 0) {
                    totalPositionForBar += collateralPoolDepositUSD;
                    totalWeightedAPR += collateralPoolDepositUSD * poolAPR;
                    totalDepositUSD += collateralPoolDepositUSD;
                    // Track for tooltip
                    positionAPRs.push({
                      poolType: "collateral",
                      marketId: id,
                      depositUSD: collateralPoolDepositUSD,
                      apr: poolAPR,
                    });
                  } else {
                    // Still count position even if no APR
                    totalPositionForBar += collateralPoolDepositUSD;
                  }
                }

                // Sail Pool
                if (hasSailPool && sailPoolDepositUSD > 0) {
                  const sailPoolAddress = (m as any).addresses
                    ?.stabilityPoolLeveraged as `0x${string}`;
                  const poolReward = poolRewardsMap.get(sailPoolAddress);

                  // Use totalRewardAPR from useAllStabilityPoolRewards (includes all reward tokens)
                  const poolAPR = poolReward?.totalRewardAPR || 0;

                  if (poolAPR > 0) {
                    totalPositionForBar += sailPoolDepositUSD;
                    totalWeightedAPR += sailPoolDepositUSD * poolAPR;
                    totalDepositUSD += sailPoolDepositUSD;
                    // Track for tooltip
                    positionAPRs.push({
                      poolType: "sail",
                      marketId: id,
                      depositUSD: sailPoolDepositUSD,
                      apr: poolAPR,
                    });
                  } else {
                    // Still count position even if no APR
                    totalPositionForBar += sailPoolDepositUSD;
                  }
                }

                // Wallet ha tokens (don't earn APR, but count towards total position)
                if (
                  userDeposit &&
                  userDeposit > 0n &&
                  positionData?.walletHaUSD
                ) {
                  totalPositionForBar += positionData.walletHaUSD;
                  // Note: ha tokens in wallet don't earn APR, so we don't add them to blended APR
                }
              });
            }

            const rewardsPercentage =
              totalPositionForBar > 0
                ? Math.min(
                    (totalRewardsForBar / totalPositionForBar) * 100,
                    100
                  )
                : 0;
            // Calculate blended APR from stability pool positions
            const blendedAPRForBar =
              totalDepositUSD > 0 ? totalWeightedAPR / totalDepositUSD : 0;

            const marksPerDayText = !ANCHOR_MARKS_ENABLED
              ? "0 marks/day"
              : !mounted || isLoadingLedgerMarks
                ? ""
                : totalAnchorLedgerMarksPerDay > 0
                  ? `${totalAnchorLedgerMarksPerDay.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })} marks/day`
                  : "0 marks/day";

            const ledgerMarksDisplay = !ANCHOR_MARKS_ENABLED
              ? "0"
              : !mounted || isLoadingLedgerMarks
                ? "-"
                : totalAnchorLedgerMarks > 0
                  ? totalAnchorLedgerMarks.toLocaleString(undefined, {
                      minimumFractionDigits:
                        totalAnchorLedgerMarks < 100 ? 2 : 0,
                      maximumFractionDigits:
                        totalAnchorLedgerMarks < 100 ? 2 : 0,
                    })
                  : "0";

            return (
              <div className="mb-2">
                <div className={HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS}>
                  <div className={HARBOR_STAT_TILE_INTRO_STRIP_GRID_6_CLASS}>
                    <div
                      className={`${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} col-span-2 sm:col-span-1`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>
                          Rewards
                        </h2>
                        <InfoTooltip
                          label={
                            <div className="space-y-3">
                              <div>
                                <h3 className="mb-2 text-lg font-bold">
                                  Anchor Ledger Marks
                                </h3>
                                <p className="leading-relaxed text-white/90">
                                  Anchor Ledger Marks are earned by holding anchor
                                  tokens and depositing into stability pools.
                                </p>
                              </div>

                              <div className="border-t border-white/20 pt-3">
                                <p className="mb-2 leading-relaxed text-white/90">
                                  Each mark represents your contribution to
                                  stabilizing Harbor markets through token holdings
                                  and pool deposits.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 text-white/70">•</span>
                                  <p className="leading-relaxed text-white/90">
                                    The more you contribute, the deeper your mark on
                                    the ledger.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 text-white/70">•</span>
                                  <p className="leading-relaxed text-white/90">
                                    When $TIDE surfaces, these marks will convert
                                    into your share of rewards and governance power.
                                  </p>
                                </div>
                              </div>

                              <div className="border-t border-white/20 pt-3">
                                <p className="italic leading-relaxed text-white/80">
                                  Think of them as a record of your journey — every
                                  mark, a line in Harbor&apos;s logbook.
                                </p>
                              </div>
                            </div>
                          }
                          side="right"
                        />
                      </div>
                    </div>

                    <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                        Total Deposits
                      </div>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                        {totalStabilityPoolDepositsUSD > 0
                          ? formatCompactUSD(totalStabilityPoolDepositsUSD)
                          : "$0.00"}
                      </div>
                    </div>

                    <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                        Claimable Value
                      </div>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                        $
                        {totalRewardsForBar > 0
                          ? totalRewardsForBar.toFixed(2)
                          : "0.00"}
                      </div>
                    </div>

                    <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                      <div
                        className={`${HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS} flex items-center justify-center gap-1`}
                      >
                        vAPR
                        <InfoTooltip
                          side="left"
                          label={
                            <AnchorVaprTooltipContent
                              positionAPRs={positionAPRs}
                              blendedAPR={blendedAPRForBar}
                              showLiveAprLoading={showLiveAprLoading}
                              isErrorAllRewards={isErrorAllRewards}
                              projectedAPR={projectedAPR}
                            />
                          }
                        >
                          <span className="cursor-help text-xs text-white/50">
                            [?]
                          </span>
                        </InfoTooltip>
                      </div>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                        {blendedAPRForBar > 0
                          ? `${blendedAPRForBar.toFixed(2)}%`
                          : "-"}
                      </div>
                    </div>

                    <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                      <button
                        onClick={onClaimAll}
                        disabled={isClaimingAll || isCompoundingAll}
                        className={INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL}
                      >
                        Claim
                      </button>
                    </div>

                    <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                      <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                        Anchor Ledger Marks
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-2">
                        <span
                          className={`${HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS} mt-0`}
                        >
                          {ledgerMarksDisplay}
                        </span>
                        {marksPerDayText ? (
                          <span className="text-[10px] font-medium text-white/60">
                            {marksPerDayText}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
}
