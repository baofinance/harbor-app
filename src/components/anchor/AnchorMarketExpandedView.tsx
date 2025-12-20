"use client";

import React, { useMemo } from "react";
import SimpleTooltip from "@/components/SimpleTooltip";
import { EtherscanLink as SharedEtherscanLink } from "@/components/shared";
import { useStabilityPoolRewards } from "@/hooks/useStabilityPoolRewards";
import { useHarvest } from "@/hooks/useHarvest";
import { useHarvestAction } from "@/hooks/useHarvestAction";
import {
  formatRatio,
  formatAPR,
  formatCompactUSD,
  calculateVolatilityProtection,
} from "@/utils/anchor";
import { formatToken } from "@/utils/formatters";

// Harvest Section Component
function HarvestSection({
  minterAddress,
  stabilityPoolManagerAddress,
  wrappedCollateralSymbol,
}: {
  minterAddress: `0x${string}`;
  stabilityPoolManagerAddress: `0x${string}`;
  wrappedCollateralSymbol: string;
}) {
  const harvestData = useHarvest(
    minterAddress,
    stabilityPoolManagerAddress,
    18
  );

  const { harvest, isPending, isSuccess, error } = useHarvestAction(
    stabilityPoolManagerAddress,
    BigInt(0)
  );

  const hasHarvestable = harvestData.harvestableAmount > BigInt(0);
  const bountyPercent = harvestData.bountyRatio
    ? Number(harvestData.bountyAmountFormatted) /
      Number(harvestData.harvestableAmountFormatted) *
      100
    : 0;

  if (harvestData.isLoading) {
    return (
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
          Harvest Rewards
        </h3>
        <div className="text-xs text-[#1E4775]/50">Loading harvest data...</div>
      </div>
    );
  }

  if (!hasHarvestable) {
    return (
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
          Harvest Rewards
        </h3>
        <div className="text-xs text-[#1E4775]/50">
          No harvestable amount available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 mt-0">
      <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
        Harvest Rewards
      </h3>
      <div className="space-y-2">
        {/* Harvestable Amount */}
        <div className="bg-[#1E4775]/5 p-2 rounded">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#1E4775]/70">Available to Harvest:</span>
            <span className="text-sm font-bold text-[#1E4775] font-mono">
              {parseFloat(harvestData.harvestableAmountFormatted).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                }
              )}{" "}
              {wrappedCollateralSymbol}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-xs">
          {/* Bounty (Your Reward) */}
          <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 p-2 rounded">
            <span className="text-[#1E4775]/70 font-medium">
              Your Bounty ({bountyPercent.toFixed(1)}%)
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400 font-mono">
              {parseFloat(harvestData.bountyAmountFormatted).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                }
              )}{" "}
              {wrappedCollateralSymbol}
            </span>
          </div>

          {/* Protocol Cut */}
          <div className="flex justify-between items-center text-[#1E4775]/70">
            <span>Protocol Fee:</span>
            <span className="font-mono">
              {parseFloat(harvestData.cutAmountFormatted).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                }
              )}{" "}
              {wrappedCollateralSymbol}
            </span>
          </div>

          {/* Pool Distribution */}
          <div className="flex justify-between items-center text-[#1E4775]/70">
            <span>To Stability Pools:</span>
            <span className="font-mono">
              {parseFloat(harvestData.poolAmountFormatted).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                }
              )}{" "}
              {wrappedCollateralSymbol}
            </span>
          </div>
        </div>

        {/* Harvest Button */}
        <button
          onClick={harvest}
          disabled={isPending || !hasHarvestable}
          className="w-full px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
        >
          {isPending
            ? "Harvesting..."
            : isSuccess
            ? "Harvested!"
            : `Harvest & Earn ${parseFloat(
                harvestData.bountyAmountFormatted
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })} ${wrappedCollateralSymbol}`}
        </button>

        {/* Success Message */}
        {isSuccess && (
          <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded">
            ✅ Harvest successful! You received{" "}
            {parseFloat(harvestData.bountyAmountFormatted).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 4,
                maximumFractionDigits: 6,
              }
            )}{" "}
            {wrappedCollateralSymbol} as bounty.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            Harvest failed: {error.message || "Unknown error"}
          </div>
        )}

        {/* Info Note */}
        <p className="text-[10px] text-[#1E4775]/50">
          💡 Anyone can call harvest. The bounty is automatically sent to your
          wallet. The remaining amount is distributed to stability pools.
        </p>
      </div>
    </div>
  );
}

interface AnchorMarketExpandedViewProps {
  marketId: string;
  market: any;
  minterAddress: string | undefined;
  stabilityPoolAddress: string | undefined;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
  stabilityPoolTVL: bigint | undefined;
  stabilityPoolAPR: { collateral: number; steam: number } | undefined;
  totalDebt: bigint | undefined;
  collateralPoolTVL: bigint | undefined;
  sailPoolTVL: bigint | undefined;
  peggedTokenPrice: bigint | undefined;
  collateralPoolRewards: bigint | undefined;
  sailPoolRewards: bigint | undefined;
  collateralPoolDeposit: bigint | undefined;
  collateralPoolDepositUSD: number;
  sailPoolDeposit: bigint | undefined;
  sailPoolDepositUSD: number;
  haTokenBalance: bigint;
  haTokenBalanceUSD: number;
  collateralPrice: bigint | undefined;
  collateralPriceDecimals: number | undefined;
  collateralPoolAPR: { collateral: number; steam: number } | undefined;
  sailPoolAPR: { collateral: number; steam: number } | undefined;
  projectedCollateralPoolAPR: number | null;
  projectedSailPoolAPR: number | null;
  projectedAPRLoading: boolean;
  harvestableAmount: bigint | null;
  remainingDaysUntilHarvest: number | null;
  onClaimCollateralRewards: () => void;
  onCompoundCollateralRewards: () => void;
  onClaimSailRewards: () => void;
  onCompoundSailRewards: () => void;
  isClaiming: boolean;
  isCompounding: boolean;
  handleCompoundRewards: (
    market: any,
    poolType: "collateral" | "sail",
    rewardAmount: bigint
  ) => void;
  allPoolRewards?: Array<{
    poolAddress: string;
    totalAPR?: number;
    tvl?: bigint;
  }>;
  fxUSDPrice?: number;
  fxSAVEPrice?: number;
  usdcPrice?: number;
  ethPrice?: number;
  wrappedRate?: bigint;
}

export function AnchorMarketExpandedView({
  marketId,
  market,
  minterAddress,
  stabilityPoolAddress,
  collateralRatio,
  collateralValue,
  stabilityPoolTVL,
  stabilityPoolAPR,
  totalDebt,
  collateralPoolTVL,
  sailPoolTVL,
  peggedTokenPrice,
  collateralPoolRewards,
  sailPoolRewards,
  collateralPoolDeposit,
  collateralPoolDepositUSD,
  sailPoolDeposit,
  sailPoolDepositUSD,
  haTokenBalance,
  haTokenBalanceUSD,
  collateralPrice,
  collateralPriceDecimals,
  collateralPoolAPR,
  sailPoolAPR,
  projectedCollateralPoolAPR,
  projectedSailPoolAPR,
  projectedAPRLoading,
  harvestableAmount,
  remainingDaysUntilHarvest,
  onClaimCollateralRewards,
  onCompoundCollateralRewards,
  onClaimSailRewards,
  onCompoundSailRewards,
  isClaiming,
  isCompounding,
  handleCompoundRewards,
  allPoolRewards,
  fxUSDPrice,
  fxSAVEPrice,
  usdcPrice,
  ethPrice,
  wrappedRate,
}: AnchorMarketExpandedViewProps) {
  const volatilityProtection = calculateVolatilityProtection(
    collateralRatio,
    totalDebt,
    collateralPoolTVL,
    sailPoolTVL
  );

  const hasCollateralRewards =
    collateralPoolRewards && collateralPoolRewards > 0n;
  const hasSailRewards = sailPoolRewards && sailPoolRewards > 0n;

  // Calculate additional metrics
  const minCollateralRatio = 100; // Default to 100% (1.0), could be fetched from config if available
  const currentCR = collateralRatio ? Number(collateralRatio) / 1e16 : 0;
  const safetyBuffer =
    currentCR > minCollateralRatio
      ? ((currentCR - minCollateralRatio) / minCollateralRatio) * 100
      : 0;

  // Calculate pool shares
  const collateralPoolShare =
    collateralPoolTVL && collateralPoolDeposit
      ? (Number(collateralPoolDeposit) / Number(collateralPoolTVL)) * 100
      : 0;
  const sailPoolShare =
    sailPoolTVL && sailPoolDeposit
      ? (Number(sailPoolDeposit) / Number(sailPoolTVL)) * 100
      : 0;

  // Calculate estimated yields - use projected APR if available
  const collateralPoolAPRTotal = collateralPoolAPR
    ? (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0)
    : 0;
  const sailPoolAPRTotal = sailPoolAPR
    ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
    : 0;

  // Use projected APR if available, otherwise fall back to contract APR
  const effectiveCollateralAPR =
    projectedCollateralPoolAPR ?? collateralPoolAPRTotal;
  const effectiveSailAPR = projectedSailPoolAPR ?? sailPoolAPRTotal;

  // Weighted average APR based on deposits
  const totalDepositUSD = collateralPoolDepositUSD + sailPoolDepositUSD;
  let weightedAPR = 0;
  if (totalDepositUSD > 0) {
    weightedAPR =
      (collateralPoolDepositUSD * effectiveCollateralAPR +
        sailPoolDepositUSD * effectiveSailAPR) /
      totalDepositUSD;
  }

  // Estimated annual yield
  const estimatedAnnualYield = totalDepositUSD * (weightedAPR / 100);
  const estimatedDailyEarnings = estimatedAnnualYield / 365;
  const estimatedWeeklyEarnings = estimatedAnnualYield / 52;

  // Helper function to format numbers with 2 decimals when below 100
  const formatNumberWithDecimals = (value: number, defaultDecimals: number = 2): string => {
    if (value < 100) {
      return value.toFixed(2);
    }
    return value.toFixed(defaultDecimals);
  };

  // Pegged token price in USD
  const peggedTokenPriceUSD =
    peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined
      ? (Number(peggedTokenPrice) / 1e18) *
        (Number(collateralPrice) / 10 ** collateralPriceDecimals)
      : 1; // Default to $1 if price unavailable

  // Build token price map for reward calculations
  const tokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();

    // Add collateral price (for wstETH/stETH rewards)
    if (collateralPrice && collateralPriceDecimals !== undefined) {
      const collateralTokenAddress = market?.collateral?.address?.toLowerCase();
      if (collateralTokenAddress) {
        const price = Number(collateralPrice) / 10 ** collateralPriceDecimals;
        map.set(collateralTokenAddress, price);
      }
      // Also add wstETH if it's a different address
      const wstETHAddress = market?.addresses?.wstETH?.toLowerCase();
      if (wstETHAddress && wstETHAddress !== collateralTokenAddress) {
        const price = Number(collateralPrice) / 10 ** collateralPriceDecimals;
        map.set(wstETHAddress, price);
      }
    }

    // Add pegged token price (for ha token rewards)
    const peggedTokenAddress = market?.peggedToken?.address?.toLowerCase();
    if (peggedTokenAddress && peggedTokenPriceUSD > 0) {
      map.set(peggedTokenAddress, peggedTokenPriceUSD);
    }

    return map;
  }, [collateralPrice, collateralPriceDecimals, peggedTokenPriceUSD, market]);

  // Fetch rewards for collateral pool
  const collateralPoolAddress = market?.addresses?.stabilityPoolCollateral as
    | `0x${string}`
    | undefined;
  const collateralPoolRewardsData = useStabilityPoolRewards({
    poolAddress: collateralPoolAddress,
    depositTokenPrice: peggedTokenPriceUSD,
    tokenPriceMap,
    enabled: !!collateralPoolAddress,
  });

  // Fetch rewards for sail pool
  const sailPoolAddress = market?.addresses?.stabilityPoolLeveraged as
    | `0x${string}`
    | undefined;
  const sailPoolRewardsData = useStabilityPoolRewards({
    poolAddress: sailPoolAddress,
    depositTokenPrice: peggedTokenPriceUSD,
    tokenPriceMap,
    enabled: !!sailPoolAddress,
  });

  // Calculate USD values
  // Total debt in USD
  const totalDebtUSD =
    totalDebt && peggedTokenPriceUSD > 0
      ? (Number(totalDebt) / 1e18) * peggedTokenPriceUSD
      : 0;

  // CoinGecko prices are now provided by useAnchorPrices hook
  
  // Detect if this is an fxUSD market
  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket = collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
  
  // Collateral value in USD calculation
  // For fxUSD markets: if oracle price is missing, use CoinGecko fallback
  let effectiveCollateralPriceUSD = collateralPrice && collateralPriceDecimals !== undefined
    ? Number(collateralPrice) / 10 ** collateralPriceDecimals
    : 0;
  
  if (isFxUSDMarket && effectiveCollateralPriceUSD === 0) {
    // Use CoinGecko prices fetched at component level
    if (collateralSymbol === "fxusd") {
      effectiveCollateralPriceUSD = fxUSDPrice || usdcPrice || 1.0;
    } else if (collateralSymbol === "fxsave") {
      effectiveCollateralPriceUSD = fxSAVEPrice || usdcPrice || 1.0;
    } else {
      effectiveCollateralPriceUSD = usdcPrice || 1.0;
    }
  }
  
  // Collateral value in USD = collateralRatio * totalDebtUSD
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% = 2.0)
  // But we also need to account for the actual collateral value if available
  let collateralValueUSD = 0;
  if (collateralRatio && totalDebtUSD > 0) {
    collateralValueUSD = (Number(collateralRatio) / 1e18) * totalDebtUSD;
  } else if (collateralValue && effectiveCollateralPriceUSD > 0) {
    // Fallback: calculate from collateralValue directly
    const collateralTokens = Number(collateralValue) / 1e18;
    if (isFxUSDMarket) {
      // fxUSD markets: collateralValue is already in underlying (fxUSD)
      collateralValueUSD = collateralTokens * effectiveCollateralPriceUSD;
    } else {
      // wstETH markets: collateralValue is in wrapped, need wrappedRate
      const wrappedRateNum = wrappedRate ? Number(wrappedRate) / 1e18 : 1;
      collateralValueUSD = collateralTokens * wrappedRateNum * effectiveCollateralPriceUSD;
    }
  }

  // Pegged tokens USD value (same as totalDebtUSD)
  const peggedTokensValueUSD = totalDebtUSD;

  // Total supply (outstanding ha tokens)
  const totalSupply = totalDebt ? formatToken(totalDebt) : "0";

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
      {/* Market Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Collateral Ratio
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {formatRatio(collateralRatio)}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Min Collateral Ratio
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {minCollateralRatio}%
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Safety: {formatNumberWithDecimals(safetyBuffer, 1)}%
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Total Debt
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">{totalSupply}</p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.peggedToken?.symbol || "ha"}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs flex items-center gap-1">
            Volatility Protection
            <SimpleTooltip
              side="top"
              label={
                <div className="space-y-2">
                  <p className="font-semibold mb-1">Volatility Protection</p>
                  <p>
                    The percentage adverse price movement between collateral and
                    the pegged token that the system can withstand before
                    reaching the depeg point (100% collateral ratio).
                  </p>
                  <p>
                    For example, an ETH-pegged token with USD collateral is
                    protected against ETH price spikes (ETH becoming more
                    expensive relative to USD).
                  </p>
                  <p>
                    This accounts for stability pools that can rebalance and
                    improve the collateral ratio during adverse price movements.
                  </p>
                  <p className="text-xs text-gray-400 italic">
                    Higher percentage = more protection. Assumes no additional
                    deposits or withdrawals.
                  </p>
                </div>
              }
            >
              <span className="text-[#1E4775]/50 cursor-help">[?]</span>
            </SimpleTooltip>
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {volatilityProtection}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Price drop to &lt;100% CR
          </p>
        </div>
      </div>

      {/* Token Price & Supply */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Pegged Token Price
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            ${peggedTokenPriceUSD > 0 ? formatNumberWithDecimals(peggedTokenPriceUSD, 4) : "-"}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            NAV per {market.peggedToken?.symbol || "ha"}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Total Supply
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">{totalSupply}</p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.peggedToken?.symbol || "ha"} tokens
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Collateral Value
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {formatToken(collateralValue)}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.collateral?.symbol || "ETH"}
          </p>
        </div>
      </div>

      {/* Market Value Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Collateral Value (USD)
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {collateralValueUSD > 0
              ? `$${collateralValueUSD < 100 
                  ? formatNumberWithDecimals(collateralValueUSD, 2)
                  : collateralValueUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}`
              : "-"}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Total {market.collateral?.symbol || "ETH"} value
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Pegged Tokens Value (USD)
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {peggedTokensValueUSD > 0
              ? `$${peggedTokensValueUSD < 100 
                  ? formatNumberWithDecimals(peggedTokensValueUSD, 2)
                  : peggedTokensValueUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}`
              : "-"}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Total {market.peggedToken?.symbol || "ha"} value
          </p>
        </div>
      </div>

      {/* Projected APR Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        {market.addresses?.stabilityPoolCollateral && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs flex items-center gap-1">
              Collateral Pool APR
              <SimpleTooltip
                label={`Projected APR for the next 7-day reward period based on current harvestable yield (${
                  harvestableAmount ? Number(harvestableAmount) / 1e18 : 0
                } wstETH).${
                  remainingDaysUntilHarvest !== null
                    ? ` Approximately ${remainingDaysUntilHarvest.toFixed(
                        1
                      )} days until next harvest.`
                    : ""
                } After harvest, rewards will be distributed to depositors over 7 days.`}
              >
                <span className="text-[#1E4775]/50 cursor-help">[?]</span>
              </SimpleTooltip>
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {projectedAPRLoading ? (
                <span className="text-[#1E4775]/50">Loading...</span>
              ) : projectedCollateralPoolAPR !== null ? (
                formatAPR(projectedCollateralPoolAPR)
              ) : (
                formatAPR(collateralPoolAPRTotal)
              )}
            </p>
            {collateralPoolDepositUSD > 0 && (
              <p className="text-xs text-[#1E4775]/70 mt-0.5">
                Your share: {formatNumberWithDecimals(collateralPoolShare, 2)}%
              </p>
            )}
            {projectedCollateralPoolAPR !== null && (
              <p className="text-xs text-[#1E4775]/50 mt-0.5 italic">
                Projected for next period
              </p>
            )}
          </div>
        )}

        {market.addresses?.stabilityPoolLeveraged && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs flex items-center gap-1">
              Sail Pool APR
              <SimpleTooltip
                label={`Projected APR for the next 7-day reward period based on current harvestable yield.${
                  remainingDaysUntilHarvest !== null
                    ? ` Approximately ${remainingDaysUntilHarvest.toFixed(
                        1
                      )} days until next harvest.`
                    : ""
                } After harvest, rewards will be distributed to depositors over 7 days.`}
              >
                <span className="text-[#1E4775]/50 cursor-help">[?]</span>
              </SimpleTooltip>
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {projectedAPRLoading ? (
                <span className="text-[#1E4775]/50">Loading...</span>
              ) : projectedSailPoolAPR !== null ? (
                formatAPR(projectedSailPoolAPR)
              ) : (
                formatAPR(sailPoolAPRTotal)
              )}
            </p>
            {sailPoolDepositUSD > 0 && (
              <p className="text-xs text-[#1E4775]/70 mt-0.5">
                Your share: {formatNumberWithDecimals(sailPoolShare, 2)}%
              </p>
            )}
            {projectedSailPoolAPR !== null && (
              <p className="text-xs text-[#1E4775]/50 mt-0.5 italic">
                Projected for next period
              </p>
            )}
          </div>
        )}
      </div>

      {/* Your Yield Estimates */}
      {totalDepositUSD > 0 && (
        <div className="bg-white p-3 mb-2">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
            Your Estimated Yield
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <p className="text-xs text-[#1E4775]/70">Annual Yield</p>
              <p className="text-sm font-bold text-[#1E4775]">
                ${formatNumberWithDecimals(estimatedAnnualYield, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#1E4775]/70">Weekly Earnings</p>
              <p className="text-sm font-bold text-[#1E4775]">
                ${formatNumberWithDecimals(estimatedWeeklyEarnings, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#1E4775]/70">Daily Earnings</p>
              <p className="text-sm font-bold text-[#1E4775]">
                ${formatNumberWithDecimals(estimatedDailyEarnings, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#1E4775]/70">Weighted APR</p>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatAPR(weightedAPR)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        {/* Collateral Pool Rewards */}
        {market.addresses?.stabilityPoolCollateral && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">
              Collateral Pool Rewards
            </h3>
            {collateralPoolRewardsData.loading ? (
              <div className="text-xs text-[#1E4775]/50">
                Loading rewards...
              </div>
            ) : collateralPoolRewardsData.rewardTokens && collateralPoolRewardsData.rewardTokens.length > 0 ? (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  {collateralPoolRewardsData.rewardTokens.map((reward) => (
                    <div
                      key={reward.address}
                      className="flex justify-between items-center py-1 border-b border-[#1E4775]/10 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-xs text-[#1E4775]/70">
                          {reward.symbol}
                        </div>
                        <div className="text-sm font-bold text-[#1E4775] font-mono">
                          {(() => {
                            const amount = parseFloat(reward.claimableFormatted);
                            return amount < 100 ? amount.toFixed(2) : amount.toFixed(6);
                          })()}
                          {""}
                          {reward.symbol}
                        </div>
                        {reward.claimableUSD > 0 && (
                          <div className="text-[10px] text-[#1E4775]/50">
                            ${formatNumberWithDecimals(reward.claimableUSD, 2)} USD
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-[#1E4775]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#1E4775]/70">
                      Total Claimable:
                    </span>
                    <span className="text-sm font-bold text-[#1E4775] font-mono">
                      ${formatNumberWithDecimals(collateralPoolRewardsData.claimableValue, 2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onClaimCollateralRewards}
                      disabled={
                        collateralPoolRewardsData.claimableValue === 0 ||
                        isClaiming ||
                        isCompounding
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
                    >
                      Claim
                    </button>
                    <button
                      onClick={() => {
                        if (!handleCompoundRewards) {
                          return;
                        }
                        const rewardAmount =
                          collateralPoolRewardsData.claimableValue > 0
                            ? BigInt(
                                Math.floor(
                                  collateralPoolRewardsData.claimableValue *
                                    1e18
                                )
                              )
                            : 0n;
                        handleCompoundRewards(
                          market,
                          "collateral",
                          rewardAmount
                        );
                      }}
                      disabled={
                        collateralPoolRewardsData.claimableValue === 0 ||
                        isClaiming ||
                        isCompounding
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
                    >
                      Compound
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-[#1E4775]/50">
                  No claimable rewards
                </div>
                <div className="flex gap-2">
                  <button
                    disabled
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed rounded-full"
                  >
                    Claim
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed rounded-full"
                  >
                    Compound
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sail Pool Rewards */}
        {market.addresses?.stabilityPoolLeveraged && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">
              Sail Pool Rewards
            </h3>
            {sailPoolRewardsData.loading ? (
              <div className="text-xs text-[#1E4775]/50">
                Loading rewards...
              </div>
            ) : sailPoolRewardsData.rewardTokens && sailPoolRewardsData.rewardTokens.length > 0 ? (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  {sailPoolRewardsData.rewardTokens.map((reward) => (
                    <div
                      key={reward.address}
                      className="flex justify-between items-center py-1 border-b border-[#1E4775]/10 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-xs text-[#1E4775]/70">
                          {reward.symbol}
                        </div>
                        <div className="text-sm font-bold text-[#1E4775] font-mono">
                          {(() => {
                            const amount = parseFloat(reward.claimableFormatted);
                            return amount < 100 ? amount.toFixed(2) : amount.toFixed(6);
                          })()}
                          {""}
                          {reward.symbol}
                        </div>
                        {reward.claimableUSD > 0 && (
                          <div className="text-[10px] text-[#1E4775]/50">
                            ${formatNumberWithDecimals(reward.claimableUSD, 2)} USD
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-[#1E4775]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#1E4775]/70">
                      Total Claimable:
                    </span>
                    <span className="text-sm font-bold text-[#1E4775] font-mono">
                      ${formatNumberWithDecimals(sailPoolRewardsData.claimableValue, 2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onClaimSailRewards}
                      disabled={
                        sailPoolRewardsData.claimableValue === 0 ||
                        isClaiming ||
                        isCompounding
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
                    >
                      Claim
                    </button>
                    <button
                      onClick={() => {
                        if (!handleCompoundRewards) {
                          return;
                        }
                        const rewardAmount =
                          sailPoolRewardsData.claimableValue > 0
                            ? BigInt(
                                Math.floor(
                                  sailPoolRewardsData.claimableValue * 1e18
                                )
                              )
                            : 0n;
                        handleCompoundRewards(market, "sail", rewardAmount);
                      }}
                      disabled={
                        sailPoolRewardsData.claimableValue === 0 ||
                        isClaiming ||
                        isCompounding
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
                    >
                      Compound
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-[#1E4775]/50">
                  No claimable rewards
                </div>
                <div className="flex gap-2">
                  <button
                    disabled
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed rounded-full"
                  >
                    Claim
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed rounded-full"
                  >
                    Compound
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Your Position Section */}
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">
          Your Position
        </h3>
        <div className="space-y-2">
          {/* Collateral Pool Deposit */}
          {market.addresses?.stabilityPoolCollateral && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#1E4775]/70">
                  Collateral Pool:
                </span>
                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                  collateral
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#1E4775] font-mono">
                  {formatCompactUSD(collateralPoolDepositUSD)}
                </div>
                {collateralPoolDeposit && collateralPoolDeposit > 0n && (
                  <div className="text-xs text-[#1E4775]/70 font-mono">
                    {formatToken(collateralPoolDeposit)}
                    {""}
                    {market.peggedToken?.symbol || "ha"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sail Pool Deposit */}
          {market.addresses?.stabilityPoolLeveraged && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#1E4775]/70">Sail Pool:</span>
                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                  sail
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#1E4775] font-mono">
                  {formatCompactUSD(sailPoolDepositUSD)}
                </div>
                {sailPoolDeposit && sailPoolDeposit > 0n && (
                  <div className="text-xs text-[#1E4775]/70 font-mono">
                    {formatToken(sailPoolDeposit)}
                    {""}
                    {market.peggedToken?.symbol || "ha"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Naked ha Tokens in Wallet */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#1E4775]/70">In Wallet:</span>
            <div className="text-right">
              <div className="text-sm font-bold text-[#1E4775] font-mono">
                {formatCompactUSD(haTokenBalanceUSD)}
              </div>
              {haTokenBalance && haTokenBalance > 0n && (
                <div className="text-xs text-[#1E4775]/70 font-mono">
                  {formatToken(haTokenBalance)}
                  {""}
                  {market.peggedToken?.symbol || "ha"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Harvest Section */}
      {(market as any).addresses?.stabilityPoolManager && minterAddress && (
        <HarvestSection
          minterAddress={minterAddress as `0x${string}`}
          stabilityPoolManagerAddress={(market as any).addresses
            ?.stabilityPoolManager as `0x${string}`}
          wrappedCollateralSymbol={market.collateral?.symbol || "wstETH"}
        />
      )}

      {/* Contract Information */}
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
          Contract Addresses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <SharedEtherscanLink label="Minter" address={minterAddress} />
            <SharedEtherscanLink
              label="Collateral Pool"
              address={(market as any).addresses?.stabilityPoolCollateral}
            />
            <SharedEtherscanLink
              label="Sail Pool"
              address={(market as any).addresses?.stabilityPoolLeveraged}
            />
          </div>
          <div className="space-y-1">
            <SharedEtherscanLink
              label="ha Token"
              address={(market as any).addresses?.peggedToken}
            />
            <SharedEtherscanLink
              label="Collateral Token"
              address={(market as any).addresses?.collateralToken}
            />
            <SharedEtherscanLink
              label="Price Oracle"
              address={(market as any).addresses?.collateralPrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

