import { useMemo } from "react";
import { getAcceptedDepositAssets } from "@/utils/anchor";

export type MarketData = {
  marketId: string;
  market: any;
  marketIndex: number;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
  totalDebt: bigint | undefined;
  peggedTokenPrice: bigint | undefined;
  leveragedTokenBalance: bigint | undefined;
  leveragedTokenPrice: bigint | undefined;
  collateralPoolTVL: bigint | undefined;
  collateralPoolAPR: { collateral: number; steam: number } | undefined;
  collateralPoolRewards: bigint | undefined;
  collateralPoolDeposit: bigint;
  collateralPoolDepositUSD: number;
  sailPoolTVL: bigint | undefined;
  sailPoolAPR: { collateral: number; steam: number } | undefined;
  sailPoolRewards: bigint | undefined;
  sailPoolDeposit: bigint;
  sailPoolDepositUSD: number;
  haTokenBalanceUSD: number;
  collateralRewardsUSD: number;
  sailRewardsUSD: number;
  collateralPrice: bigint | undefined;
  collateralPriceDecimals: number;
  wrappedRate: bigint | undefined;
  fxSAVEPriceInETH: bigint | undefined;
  userDeposit: bigint;
  minAPR: number;
  maxAPR: number;
  minProjectedAPR: number | null;
  maxProjectedAPR: number | null;
  minterAddress: string | undefined;
  minCollateralRatio: bigint | undefined;
};

/**
 * Hook to process market data from contract reads
 *
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param reads - Contract read results
 * @param marketPositions - Map of marketId -> position data
 * @param poolRewardsMap - Map of poolAddress -> reward data
 * @param poolDeposits - Array of pool deposits from subgraph
 * @param projectedAPR - Projected APR data
 * @returns Array of processed market data
 */
export function useAnchorMarketData(
  anchorMarkets: Array<[string, any]>,
  reads: any,
  marketPositions: Record<string, any>,
  poolRewardsMap: Map<`0x${string}`, any>,
  poolDeposits: Array<any> | undefined,
  projectedAPR: {
    collateralPoolAPR: number | null;
    leveragedPoolAPR: number | null;
    hasRewardsNoTVL: boolean;
    collateralRewards7Day: bigint | null;
    leveragedRewards7Day: bigint | null;
  }
): MarketData[] {
  return useMemo(() => {
    if (!reads) return [];

    // Group markets by pegged token symbol
    const groups: Record<
      string,
      Array<{
        marketId: string;
        market: any;
        marketIndex: number;
      }>
    > = {};

    anchorMarkets.forEach(([id, m], mi) => {
      const symbol = m.peggedToken?.symbol || "UNKNOWN";
      if (!groups[symbol]) {
        groups[symbol] = [];
      }
      groups[symbol].push({ marketId: id, market: m, marketIndex: mi });
    });

    // Process each group and collect all market data
    const allMarketsData: MarketData[] = [];

    Object.entries(groups).forEach(([symbol, marketList]) => {
      const marketsData = marketList.map(
        ({ marketId, market, marketIndex: mi }) => {
          const hasCollateralPool = !!(market as any).addresses
            ?.stabilityPoolCollateral;
          const hasSailPool = !!(market as any).addresses
            ?.stabilityPoolLeveraged;

          // Match subgraph deposits to this market by pool address
          const collateralPoolAddress = (
            market as any
          ).addresses?.stabilityPoolCollateral?.toLowerCase();
          const sailPoolAddress = (
            market as any
          ).addresses?.stabilityPoolLeveraged?.toLowerCase();

          // Find matching deposits from subgraph
          const subgraphCollateralDeposit = poolDeposits?.find(
            (d) =>
              collateralPoolAddress &&
              d.poolAddress.toLowerCase() === collateralPoolAddress &&
              (d.poolType === "collateral" || d.poolType === "Collateral")
          );
          const subgraphSailDeposit = poolDeposits?.find(
            (d) =>
              sailPoolAddress &&
              d.poolAddress.toLowerCase() === sailPoolAddress &&
              (d.poolType === "sail" ||
                d.poolType === "Sail" ||
                d.poolType === "leveraged")
          );

          // Detect if this is an fxUSD market
          const collateralSymbol =
            market.collateral?.symbol?.toLowerCase() || "";
          const isFxUSDMarket =
            collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

          // Calculate offset
          let offset = 0;
          for (let i = 0; i < mi; i++) {
            const prevMarket = anchorMarkets[i][1];
            const prevHasCollateral = !!(prevMarket as any).addresses
              ?.stabilityPoolCollateral;
            const prevHasSail = !!(prevMarket as any).addresses
              ?.stabilityPoolLeveraged;
            const prevHasPriceOracle = !!(prevMarket as any).addresses
              ?.collateralPrice;
            const prevHasStabilityPoolManager = !!(prevMarket as any).addresses
              ?.stabilityPoolManager;
            const prevPeggedTokenAddress = (prevMarket as any)?.addresses
              ?.peggedToken;
            const prevCollateralSymbol =
              prevMarket.collateral?.symbol?.toLowerCase() || "";
            const prevIsFxUSDMarket =
              prevCollateralSymbol === "fxusd" ||
              prevCollateralSymbol === "fxsave";
            offset += 7; // 6 minter calls (collateralRatio, collateralTokenBalance, peggedTokenBalance, peggedTokenPrice, leveragedTokenBalance, leveragedTokenPrice) + 1 config call
            if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
            if (prevHasCollateral) {
              offset += 4; // 4 pool reads
              if (prevPeggedTokenAddress) offset += 1; // rewardData (if pegged token exists)
            }
            if (prevHasSail) {
              offset += 4; // 4 pool reads
              if (prevPeggedTokenAddress) offset += 1; // rewardData (if pegged token exists)
            }
            if (prevHasPriceOracle) {
              offset += 1; // latestAnswer
              if (prevIsFxUSDMarket) offset += 1; // getPrice for fxUSD markets
            }
          }

          const baseOffset = offset;

          // Get collateralRatio - check both result and status
          const collateralRatioRead = reads?.[baseOffset];

          const collateralValueRead = reads?.[baseOffset + 1];
          const totalDebtRead = reads?.[baseOffset + 2];
          // Only use result if read was successful
          const collateralValue = 
            collateralValueRead?.status === "success" && collateralValueRead?.result !== undefined && collateralValueRead?.result !== null
              ? (collateralValueRead.result as bigint)
              : undefined;
          const totalDebt = 
            totalDebtRead?.status === "success" && totalDebtRead?.result !== undefined && totalDebtRead?.result !== null
              ? (totalDebtRead.result as bigint)
              : undefined;

          // Get collateralRatio from direct read, or calculate from collateralValue and totalDebt
          let collateralRatio: bigint | undefined;
          if (
            collateralRatioRead?.status === "success" &&
            collateralRatioRead.result !== undefined &&
            collateralRatioRead.result !== null
          ) {
            collateralRatio = collateralRatioRead.result as bigint;
          } else if (
            collateralValue !== undefined &&
            totalDebt !== undefined &&
            totalDebt > 0n
          ) {
            // Calculate collateral ratio: CR = (collateralValue / totalDebt) * 1e18
            // Both are in 18 decimals, so result is in 18 decimals
            collateralRatio = (collateralValue * 10n ** 18n) / totalDebt;
          }
          const positionData = marketPositions[marketId];
          const peggedTokenPriceRead = reads?.[baseOffset + 3];
          const peggedTokenPrice =
            peggedTokenPriceRead?.status === "success"
              ? (peggedTokenPriceRead.result as bigint | undefined)
              : positionData?.peggedTokenPrice;

          // Read leveraged token balance and price from minter
          const leveragedTokenBalanceRead = reads?.[baseOffset + 4];
          const leveragedTokenBalance =
            leveragedTokenBalanceRead?.status === "success"
              ? (leveragedTokenBalanceRead.result as bigint | undefined)
              : undefined;
          const leveragedTokenPriceRead = reads?.[baseOffset + 5];
          const leveragedTokenPrice =
            leveragedTokenPriceRead?.status === "success"
              ? (leveragedTokenPriceRead.result as bigint | undefined)
              : undefined;

          const minterConfig = reads?.[baseOffset + 6]?.result as
            | any
            | undefined;

          // Get rebalanceThreshold from StabilityPoolManager
          // This is the collateral ratio below which rebalancing can occur
          // It's at baseOffset + 7 if the market has a StabilityPoolManager
          const rebalanceThresholdResult = hasStabilityPoolManager 
            ? reads?.[baseOffset + 7]
            : undefined;
          let minCollateralRatio: bigint | undefined;

          if (
            rebalanceThresholdResult?.status === "success" &&
            rebalanceThresholdResult.result
          ) {
            minCollateralRatio = rebalanceThresholdResult.result as bigint;
          } else {
            // Fallback: Calculate from config as the lowest first boundary across all incentive configs
            // The first boundary in each config must be >= 1.0x (1 ether = 1000000000000000000)
            const allFirstBounds: bigint[] = [];

            if (
              minterConfig?.mintPeggedIncentiveConfig
                ?.collateralRatioBandUpperBounds?.[0]
            ) {
              allFirstBounds.push(
                minterConfig.mintPeggedIncentiveConfig
                  .collateralRatioBandUpperBounds[0] as bigint
              );
            }
            if (
              minterConfig?.redeemPeggedIncentiveConfig
                ?.collateralRatioBandUpperBounds?.[0]
            ) {
              allFirstBounds.push(
                minterConfig.redeemPeggedIncentiveConfig
                  .collateralRatioBandUpperBounds[0] as bigint
              );
            }
            if (
              minterConfig?.mintLeveragedIncentiveConfig
                ?.collateralRatioBandUpperBounds?.[0]
            ) {
              allFirstBounds.push(
                minterConfig.mintLeveragedIncentiveConfig
                  .collateralRatioBandUpperBounds[0] as bigint
              );
            }
            if (
              minterConfig?.redeemLeveragedIncentiveConfig
                ?.collateralRatioBandUpperBounds?.[0]
            ) {
              allFirstBounds.push(
                minterConfig.redeemLeveragedIncentiveConfig
                  .collateralRatioBandUpperBounds[0] as bigint
              );
            }

            if (allFirstBounds.length > 0) {
              // Find the minimum (lowest) first boundary
              minCollateralRatio = allFirstBounds.reduce((min, current) =>
                current < min ? current : min
              );
            }
          }

          let collateralPoolTVL: bigint | undefined;
          let collateralPoolAPR:
            | { collateral: number; steam: number }
            | undefined;
          let collateralPoolRewards: bigint | undefined;
          let collateralPoolDeposit: bigint | undefined;
          let sailPoolTVL: bigint | undefined;
          let sailPoolAPR: { collateral: number; steam: number } | undefined;
          let sailPoolRewards: bigint | undefined;
          let sailPoolDeposit: bigint | undefined;

          // Account for rebalanceThreshold if current market has stabilityPoolManager
          const hasStabilityPoolManager = !!(market as any).addresses
            ?.stabilityPoolManager;
          const currentPeggedTokenAddress = (market as any).addresses
            ?.peggedToken;
          let currentOffset = baseOffset + 7; // 6 minter calls (collateralRatio, collateralTokenBalance, peggedTokenBalance, peggedTokenPrice, leveragedTokenBalance, leveragedTokenPrice) + 1 config
          if (hasStabilityPoolManager) currentOffset += 1; // rebalanceThreshold

          if (hasCollateralPool) {
            // Read TVL from stability pool contract
            const tvlRead = reads?.[currentOffset];
            collateralPoolTVL = tvlRead?.result as bigint | undefined;
            const collateralAPRResult = reads?.[currentOffset + 1]?.result as
              | [bigint, bigint]
              | undefined;
            collateralPoolAPR = collateralAPRResult
              ? {
                  collateral: (Number(collateralAPRResult[0]) / 1e16) * 100,
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
            // Only use result if read was successful
            if (
              collateralDepositRead?.status === "success" &&
              collateralDepositRead.result !== undefined &&
              collateralDepositRead.result !== null
            ) {
              collateralPoolDeposit = collateralDepositRead.result as bigint;
            } else {
              collateralPoolDeposit = 0n;
            }

            // Read reward data for APR fallback calculation
            // Only if pegged token address exists (reward data read was added)
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
            let peggedTokenAPRForCollateral = 0;
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
                  peggedTokenAPRForCollateral =
                    (annualRewardsValueUSD / depositValueUSD) * 100;

                  // Add to existing APR (don't replace, accumulate)
                  if (peggedTokenAPRForCollateral > 0) {
                    if (!collateralPoolAPR) {
                      collateralPoolAPR = {
                        collateral: peggedTokenAPRForCollateral,
                        steam: 0,
                      };
                    } else {
                      // Add to existing APR
                      collateralPoolAPR = {
                        collateral:
                          (collateralPoolAPR.collateral || 0) +
                          peggedTokenAPRForCollateral,
                        steam: collateralPoolAPR.steam || 0,
                      };
                    }
                  }
                }
              }
            }

            // Use total APR from all reward tokens (including wstETH, etc.)
            // This replaces the contract APR with the more accurate total from all tokens
            const collateralPoolAddress = hasCollateralPool
              ? ((market as any).addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : undefined;
            if (collateralPoolAddress) {
              const poolReward = poolRewardsMap.get(collateralPoolAddress);
              const contractAPRTotal = collateralPoolAPR
                ? (collateralPoolAPR.collateral || 0) +
                  (collateralPoolAPR.steam || 0)
                : 0;
              if (
                poolReward?.totalRewardAPR !== undefined &&
                poolReward.totalRewardAPR > 0
              ) {
                // Use the total reward APR from all tokens directly
                // This includes ha tokens, wstETH, and any other reward tokens
                collateralPoolAPR = {
                  collateral: poolReward.totalRewardAPR,
                  steam: 0,
                };
              }
            }

            currentOffset += 4; // 4 pool reads
            if (currentPeggedTokenAddress) currentOffset += 1; // rewardData (if pegged token exists)
          }

          if (hasSailPool) {
            // Read TVL from stability pool contract
            const sailTvlRead = reads?.[currentOffset];
            sailPoolTVL = sailTvlRead?.result as bigint | undefined;
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
            // Only use result if read was successful
            if (
              sailDepositRead?.status === "success" &&
              sailDepositRead.result !== undefined &&
              sailDepositRead.result !== null
            ) {
              sailPoolDeposit = sailDepositRead.result as bigint;
            } else {
              sailPoolDeposit = 0n;
            }

            // Read reward data for APR fallback calculation
            // Only if pegged token address exists (reward data read was added)
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

            // Use total APR from all reward tokens (including wstETH, etc.)
            // This replaces the contract APR with the more accurate total from all tokens
            const sailPoolAddress = hasSailPool
              ? ((market as any).addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined)
              : undefined;
            if (sailPoolAddress) {
              const poolReward = poolRewardsMap.get(sailPoolAddress);
              const contractAPRTotal = sailPoolAPR
                ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
                : 0;
              if (
                poolReward?.totalRewardAPR !== undefined &&
                poolReward.totalRewardAPR > 0
              ) {
                // Use the total reward APR from all tokens directly
                // This includes ha tokens, wstETH, and any other reward tokens
                sailPoolAPR = {
                  collateral: poolReward.totalRewardAPR,
                  steam: 0,
                };
              }
            }

            currentOffset += 4; // 4 pool reads
            if (currentPeggedTokenAddress) currentOffset += 1; // rewardData (if pegged token exists)
          }

          const hasPriceOracle = !!(market as any).addresses?.collateralPrice;
          const collateralPriceDecimals = 18;
          let collateralPrice: bigint | undefined;
          let wrappedRate: bigint | undefined;
          let fxSAVEPriceInETH: bigint | undefined; // Declare outside if block for scope
          if (hasPriceOracle) {
            const latestAnswerResult = reads?.[currentOffset]?.result;
            if (
              latestAnswerResult !== undefined &&
              latestAnswerResult !== null
            ) {
              if (Array.isArray(latestAnswerResult)) {
                collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice
                wrappedRate = latestAnswerResult[3] as bigint; // maxWrappedRate
              } else if (typeof latestAnswerResult === "object") {
                const obj = latestAnswerResult as {
                  maxUnderlyingPrice?: bigint;
                  maxWrappedRate?: bigint;
                };
                collateralPrice = obj.maxUnderlyingPrice;
                wrappedRate = obj.maxWrappedRate;
              } else if (typeof latestAnswerResult === "bigint") {
                collateralPrice = latestAnswerResult;
                wrappedRate = BigInt("1000000000000000000"); // Default 1:1 ratio
              }
            }

            // For fxUSD markets, also read getPrice() to get fxSAVE price in ETH
            if (isFxUSDMarket) {
              const getPriceResult = reads?.[currentOffset + 1]?.result;
              if (getPriceResult !== undefined && getPriceResult !== null) {
                fxSAVEPriceInETH = getPriceResult as bigint;
              }
              currentOffset += 2; // Move past latestAnswer and getPrice()
            } else {
              currentOffset += 1; // Move past collateral oracle (latestAnswer only)
            }
          }

          // Get position data from unified hook (overrides reads data for consistency)
          const userDeposit = positionData?.walletHa || 0n;
          // Override pool deposits from hook for consistent display
          const finalCollateralPoolDeposit =
            positionData?.collateralPool || collateralPoolDeposit || 0n;
          const finalSailPoolDeposit =
            positionData?.sailPool || sailPoolDeposit || 0n;

          // Use position data from hook for USD values
          const collateralPoolDepositUSD = positionData?.collateralPoolUSD || 0;
          const sailPoolDepositUSD = positionData?.sailPoolUSD || 0;
          const haTokenBalanceUSD = positionData?.walletHaUSD || 0;
          let collateralRewardsUSD = 0;
          let sailRewardsUSD = 0;

          // Use aggregated rewards from useAllStabilityPoolRewards
          // This handles multiple reward tokens correctly (ha tokens, wstETH, etc.)
          const collateralPoolAddressForRewards = hasCollateralPool
            ? ((market as any).addresses?.stabilityPoolCollateral as
                | `0x${string}`
                | undefined)
            : undefined;
          if (collateralPoolAddressForRewards) {
            const poolReward = poolRewardsMap.get(
              collateralPoolAddressForRewards
            );
            if (poolReward) {
              collateralRewardsUSD = poolReward.claimableValue;
            }
          }

          const sailPoolAddressForRewards = hasSailPool
            ? ((market as any).addresses?.stabilityPoolLeveraged as
                | `0x${string}`
                | undefined)
            : undefined;
          if (sailPoolAddressForRewards) {
            const poolReward = poolRewardsMap.get(sailPoolAddressForRewards);
            if (poolReward) {
              sailRewardsUSD = poolReward.claimableValue;
            }
          }

          const collateralTotalAPR = collateralPoolAPR
            ? (collateralPoolAPR.collateral || 0) +
              (collateralPoolAPR.steam || 0)
            : 0;
          const sailTotalAPR = sailPoolAPR
            ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
            : 0;

          // Get projected APRs for this market
          const projectedCollateralAPR =
            marketId === "pb-steth" && projectedAPR.collateralPoolAPR !== null
              ? projectedAPR.collateralPoolAPR
              : null;
          const projectedSailAPR =
            marketId === "pb-steth" && projectedAPR.leveragedPoolAPR !== null
              ? projectedAPR.leveragedPoolAPR
              : null;

          // Calculate APR ranges (min and max across pools)
          const aprValues = [collateralTotalAPR, sailTotalAPR].filter(
            (v) => v > 0
          );
          const minAPR = aprValues.length > 0 ? Math.min(...aprValues) : 0;
          const maxAPR = aprValues.length > 0 ? Math.max(...aprValues) : 0;

          // Calculate projected APR range
          const projectedAprValues = [
            projectedCollateralAPR,
            projectedSailAPR,
          ].filter((v): v is number => v !== null && v > 0);
          const minProjectedAPR =
            projectedAprValues.length > 0
              ? Math.min(...projectedAprValues)
              : null;
          const maxProjectedAPR =
            projectedAprValues.length > 0
              ? Math.max(...projectedAprValues)
              : null;

          return {
            marketId,
            market,
            marketIndex: mi,
            collateralRatio,
            collateralValue,
            totalDebt,
            peggedTokenPrice,
            leveragedTokenBalance,
            leveragedTokenPrice,
            collateralPoolTVL,
            collateralPoolAPR,
            collateralPoolRewards,
            collateralPoolDeposit: finalCollateralPoolDeposit,
            collateralPoolDepositUSD,
            sailPoolTVL,
            sailPoolAPR,
            sailPoolRewards,
            sailPoolDeposit: finalSailPoolDeposit,
            sailPoolDepositUSD,
            haTokenBalanceUSD,
            collateralRewardsUSD,
            sailRewardsUSD,
            collateralPrice,
            collateralPriceDecimals,
            wrappedRate,
            fxSAVEPriceInETH: fxSAVEPriceInETH,
            userDeposit,
            minAPR,
            maxAPR,
            minProjectedAPR,
            maxProjectedAPR,
            minterAddress: (market as any).addresses?.minter,
            minCollateralRatio,
          };
        }
      );

      // Filter to only show markets where genesis has completed (has collateral deposited)
      // A market is active if it has:
      // - collateralValue > 0 (direct collateral in minter), OR
      // - totalDebt > 0 (market has been used), OR
      // - pool TVL > 0 (collateral in stability pools), OR
      // - pool deposits > 0 (user has deposited in pools)
      // This ensures all markets with any form of collateral are shown
      const activeMarketsData = marketsData.filter(
        (m) => 
          (m.collateralValue !== undefined && m.collateralValue > 0n) ||
          (m.totalDebt !== undefined && m.totalDebt > 0n) ||
          (m.collateralPoolTVL !== undefined && m.collateralPoolTVL > 0n) ||
          (m.sailPoolTVL !== undefined && m.sailPoolTVL > 0n) ||
          (m.collateralPoolDeposit > 0n) ||
          (m.sailPoolDeposit > 0n)
      );

      // Add all active markets to the result
      allMarketsData.push(...activeMarketsData);
    });

    return allMarketsData;
  }, [
    reads,
    anchorMarkets,
    marketPositions,
    poolRewardsMap,
    poolDeposits,
    projectedAPR,
  ]);
}
