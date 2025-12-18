"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  useAccount,
  useContractReads,
  useWriteContract,
  usePublicClient,
  useContractRead,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { markets } from "@/config/markets";
import { POLLING_INTERVALS } from "@/config/polling";
import {
  formatUSD,
  formatToken,
  formatDateTime,
  formatTimeRemaining,
} from "@/utils/formatters";
import {
  EtherscanLink as SharedEtherscanLink,
  TokenLogo,
  getLogoPath,
} from "@/components/shared";
import { useGenesisMarks } from "@/hooks/useGenesisMarks";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  GiftIcon,
  CheckCircleIcon,
  XMarkIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import { AnchorCompoundModal } from "@/components/AnchorCompoundModal";
import { AnchorClaimAllModal } from "@/components/AnchorClaimAllModal";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import {
  CompoundConfirmationModal,
  FeeInfo,
} from "@/components/CompoundConfirmationModal";
import {
  CompoundPoolSelectionModal,
  PoolOption,
} from "@/components/CompoundPoolSelectionModal";
import { AnchorClaimMarketModal } from "@/components/AnchorClaimMarketModal";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { aprABI } from "@/abis/apr";
import { rewardsABI } from "@/abis/rewards";
import { STABILITY_POOL_ABI, ERC20_ABI, MINTER_ABI } from "@/abis/shared";
import Image from "next/image";
import { useProjectedAPR } from "@/hooks/useProjectedAPR";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useStabilityPoolRewards } from "@/hooks/useStabilityPoolRewards";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";
import { useMultipleVolatilityProtection } from "@/hooks/useVolatilityProtection";
import { useMarketPositions } from "@/hooks/useMarketPositions";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useContractReads as useWagmiContractReads } from "wagmi";

// ---------------------------------------------------------------------------
// Token metadata (pegged / leveraged) via minter contract
// ---------------------------------------------------------------------------
const TOKEN_KIND_PEGGED = "pegged" as const;
const TOKEN_KIND_LEVERAGED = "leveraged" as const;

type TokenKind = typeof TOKEN_KIND_PEGGED | typeof TOKEN_KIND_LEVERAGED;

type TokenAddressMeta = {
  marketId: string;
  kind: TokenKind;
};

type TokenMeta = {
  peggedAddress?: `0x${string}`;
  leveragedAddress?: `0x${string}`;
  peggedSymbol?: string;
  peggedName?: string;
  leveragedSymbol?: string;
  leveragedName?: string;
};
import { usePoolRewardAPR } from "@/hooks/usePoolRewardAPR";
import { usePoolRewardTokens } from "@/hooks/usePoolRewardTokens";
import { WithdrawalTimer } from "@/components/WithdrawalTimer";
import { minterABI as fullMinterABI } from "@/abis/minter";

const minterABI = [
  {
    inputs: [],
    name: "collateralRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "config",
    outputs: [
      {
        components: [
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "mintPeggedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "redeemPeggedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "mintLeveragedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "redeemLeveragedIncentiveConfig",
            type: "tuple",
          },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minPeggedOut", type: "uint256" },
    ],
    name: "mintPeggedToken",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "collateralAmount", type: "uint256" }],
    name: "calculateMintPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "wrappedCollateralIn", type: "uint256" }],
    name: "mintPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "wrappedFee", type: "uint256" },
      { name: "wrappedCollateralTaken", type: "uint256" },
      { name: "peggedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "leveragedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    name: "redeemLeveragedToken",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "leveragedAmount", type: "uint256" }],
    name: "calculateRedeemLeveragedTokenOutput",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const stabilityPoolABI = [
  {
    inputs: [],
    name: "totalAssetSupply",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const stabilityPoolManagerABI = [
  {
    inputs: [],
    name: "rebalanceThreshold",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const erc20ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// IWrappedPriceOracle ABI - returns prices in 18 decimals
// latestAnswer() returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
const wrappedPriceOracleABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Keep alias for backwards compatibility
const chainlinkOracleABI = wrappedPriceOracleABI;

// Helper function to get accepted deposit assets from market config
function getAcceptedDepositAssets(
  market: any,
  peggedTokenSymbol?: string
): Array<{ symbol: string; name: string }> {
  const assets: Array<{ symbol: string; name: string }> = [];
  
  // Use acceptedAssets from market config if available
  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    assets.push(...market.acceptedAssets);
  } else if (market?.collateral?.symbol) {
    // Fallback: return collateral token as the only accepted asset
    assets.push({ symbol: market.collateral.symbol, name: market.collateral.name || market.collateral.symbol });
  }
  
    // Add pegged token if provided (e.g., haPB)
  if (peggedTokenSymbol && !assets.some(a => a.symbol === peggedTokenSymbol)) {
      assets.push({
        symbol: peggedTokenSymbol,
        name: peggedTokenSymbol,
      });
    }
  
    return assets;
}

function formatRatio(value: bigint | undefined): string {
  if (value === undefined || value === null) return "-";
  // Handle 0n explicitly - show"0.00%" instead of"-"
  if (value === 0n) return "0.00%";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

function formatAPR(apr: number | undefined, hasRewardsNoTVL?: boolean): string {
  if (hasRewardsNoTVL && apr !== undefined && apr >= 10000) return "10k%+";
  if (apr === undefined || isNaN(apr)) return "-";
  if (apr >= 10000) return "10k%+";
  return `${apr.toFixed(2)}%`;
}

function formatCompactUSD(value: number): string {
  if (value === 0) return "$0";
  if (value < 0) return `-${formatCompactUSD(-value)}`;

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `$${(absValue / 1e9).toFixed(2)}b`;
  }
  if (absValue >= 1e6) {
    return `$${(absValue / 1e6).toFixed(2)}m`;
  }
  if (absValue >= 1e3) {
    return `$${(absValue / 1e3).toFixed(2)}k`;
  }

  return `$${absValue.toFixed(2)}`;
}

/**
 * Calculate the adverse price movement between collateral and pegged token needed to reach below 100% collateral ratio (depeg point).
 *
 * This measures protection against relative price changes (e.g., ETH price spike for ETH-pegged token with USD collateral).
 *
 * This accounts for stability pools that can rebalance and improve the CR:
 * - Collateral Pool: Burns pegged tokens → receives collateral (reduces both debt AND collateral)
 * - Sail Pool: Burns pegged tokens → receives leveraged tokens (reduces ONLY debt, more effective)
 *
 * The sail pool is more effective because leveraged tokens represent the excess collateral
 * above 100% CR, so converting pegged→leveraged only reduces debt while collateral stays.
 */
function calculateVolatilityProtection(
  collateralRatio: bigint | undefined,
  totalDebt: bigint | undefined,
  collateralPoolTVL: bigint | undefined,
  sailPoolTVL: bigint | undefined
): string {
  // Need both CR and debt to calculate
  if (!collateralRatio || !totalDebt || totalDebt === 0n) return "-";

  // Calculate collateral value from CR and debt
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% CR)
  // collateralValue = CR * debt / 1e18
  const collateralValue = (collateralRatio * totalDebt) / 10n ** 18n;

  // Pool TVLs (in pegged tokens)
  const collateralPoolAbsorption = collateralPoolTVL || 0n;
  const sailPoolAbsorption = sailPoolTVL || 0n;

  // Total debt reduction from both pools
  const totalDebtReduction = collateralPoolAbsorption + sailPoolAbsorption;

  // Cap debt reduction at total debt
  const effectiveDebtReduction =
    totalDebtReduction > totalDebt ? totalDebt : totalDebtReduction;

  // Collateral reduction: ONLY from collateral pool (sail pool doesn't remove collateral)
  const effectiveCollateralReduction =
    collateralPoolAbsorption > collateralValue
      ? collateralValue
      : collateralPoolAbsorption;

  // Effective values after full rebalancing
  const effectiveDebt = totalDebt - effectiveDebtReduction;
  const effectiveCollateral = collateralValue - effectiveCollateralReduction;

  // If all debt can be absorbed by pools, infinite protection
  if (effectiveDebt === 0n) return ">100%";

  // If no collateral left after pool drain, already at risk
  if (effectiveCollateral === 0n) return "0%";

  // Calculate price drop needed to reach 100% CR
  // At 100% CR: effectiveCollateral * (1 - X) = effectiveDebt
  // X = 1 - (effectiveDebt / effectiveCollateral)
  const debtNum = Number(effectiveDebt);
  const collateralNum = Number(effectiveCollateral);

  if (debtNum >= collateralNum) return "0%"; // Already at or below 100% CR

  const priceDropPercent = (1 - debtNum / collateralNum) * 100;

  if (priceDropPercent <= 0) return "0%";
  if (priceDropPercent >= 100) return ">100%";

  return `${priceDropPercent.toFixed(1)}%`;
}

// Component to display reward tokens for a market group
function RewardTokensDisplay({
  collateralPool,
  sailPool,
}: {
  collateralPool: `0x${string}` | undefined;
  sailPool: `0x${string}` | undefined;
}) {
  const { data: collateralRewardTokens = [], isLoading: isLoadingCollateral } =
    usePoolRewardTokens({
      poolAddress: collateralPool,
      enabled: !!collateralPool,
    });
  const { data: sailRewardTokens = [], isLoading: isLoadingSail } =
    usePoolRewardTokens({
      poolAddress: sailPool,
      enabled: !!sailPool,
    });

  // Combine and deduplicate reward tokens, keeping full token info
  const rewardTokenMap = new Map<
    string,
    { symbol: string; displayName: string; name?: string }
  >();
  [...collateralRewardTokens, ...sailRewardTokens].forEach((token) => {
    if (token.symbol && !rewardTokenMap.has(token.symbol.toLowerCase())) {
      rewardTokenMap.set(token.symbol.toLowerCase(), {
        symbol: token.symbol,
        displayName: token.displayName || token.name || token.symbol,
        name: token.name,
      });
    }
  });
  const allRewardTokens = Array.from(rewardTokenMap.values());

  return (
    <div
      className="text-center min-w-0 flex items-center justify-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {allRewardTokens.length > 0 ? (
        <div
          className="flex items-center"
          style={{
            gap: allRewardTokens.length > 1 ? "-4px" : "4px",
          }}
        >
          {allRewardTokens.map((token, idx) => (
            <SimpleTooltip
              key={token.symbol}
              label={token.name || token.displayName}
            >
              <Image
                src={getLogoPath(token.symbol)}
                alt={token.displayName}
                width={24}
                height={24}
                className="flex-shrink-0 cursor-help rounded-full border border-white"
                style={{
                  zIndex: allRewardTokens.length - idx,
                  position: "relative",
                }}
              />
            </SimpleTooltip>
          ))}
          {/* Separator between reward tokens and Harbor Marks */}
          <span
            className="text-[#1E4775]/60 font-semibold mx-1"
            style={{
              fontSize: "14px",
            }}
          >
            +
          </span>
          {/* Ledger Marks Multiplier Logo */}
          <SimpleTooltip label="1 ledger mark per dollar per day">
            <div
              className="relative flex-shrink-0"
              style={{
                zIndex: allRewardTokens.length + 1,
              }}
            >
              <Image
                src="/icons/marks.png"
                alt="Harbor Marks 1x"
                width={24}
                height={24}
                className="flex-shrink-0 cursor-help rounded-full border border-white"
              />
            </div>
          </SimpleTooltip>
        </div>
      ) : (
        <SimpleTooltip label="1 ledger mark per dollar per day">
          <div className="relative flex-shrink-0">
            <Image
              src="/icons/marks.png"
              alt="Harbor Marks 1x"
              width={24}
              height={24}
              className="flex-shrink-0 cursor-help rounded-full border border-white"
            />
          </div>
        </SimpleTooltip>
      )}
    </div>
  );
}

function AnchorMarketExpandedView({
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
}: {
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
}) {
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

  // Collateral value in USD = collateralRatio * totalDebtUSD
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% = 2.0)
  const collateralValueUSD =
    collateralRatio && totalDebtUSD > 0
      ? (Number(collateralRatio) / 1e18) * totalDebtUSD
      : 0;

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
            Safety: {safetyBuffer.toFixed(1)}%
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
            ${peggedTokenPriceUSD > 0 ? peggedTokenPriceUSD.toFixed(4) : "-"}
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
              ? `$${collateralValueUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
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
              ? `$${peggedTokensValueUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
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
                Your share: {collateralPoolShare.toFixed(2)}%
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
                Your share: {sailPoolShare.toFixed(2)}%
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
                ${estimatedAnnualYield.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#1E4775]/70">Weekly Earnings</p>
              <p className="text-sm font-bold text-[#1E4775]">
                ${estimatedWeeklyEarnings.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#1E4775]/70">Daily Earnings</p>
              <p className="text-sm font-bold text-[#1E4775]">
                ${estimatedDailyEarnings.toFixed(2)}
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
            ) : collateralPoolRewardsData.rewardTokens.length > 0 ? (
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
                          {parseFloat(reward.claimableFormatted).toFixed(6)}
                          {""}
                          {reward.symbol}
                        </div>
                        {reward.claimableUSD > 0 && (
                          <div className="text-[10px] text-[#1E4775]/50">
                            ${reward.claimableUSD.toFixed(2)} USD
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
                      ${collateralPoolRewardsData.claimableValue.toFixed(2)}
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
            ) : sailPoolRewardsData.rewardTokens.length > 0 ? (
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
                          {parseFloat(reward.claimableFormatted).toFixed(6)}
                          {""}
                          {reward.symbol}
                        </div>
                        {reward.claimableUSD > 0 && (
                          <div className="text-[10px] text-[#1E4775]/50">
                            ${reward.claimableUSD.toFixed(2)} USD
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
                      ${sailPoolRewardsData.claimableValue.toFixed(2)}
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

export default function AnchorPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: any;
    initialTab?:
      | "mint"
      | "deposit"
      | "withdraw"
      | "redeem"
      | "deposit-mint"
      | "withdraw-redeem";
    simpleMode?: boolean;
    bestPoolType?: "collateral" | "sail";
    allMarkets?: Array<{ marketId: string; market: any }>;
  } | null>(null);
  const [compoundModal, setCompoundModal] = useState<{
    marketId: string;
    market: any;
    poolType: "collateral" | "sail";
    rewardAmount: bigint;
  } | null>(null);
  const [compoundPoolSelection, setCompoundPoolSelection] = useState<{
    market: any;
    pools: PoolOption[];
  } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isCompoundingAll, setIsCompoundingAll] = useState(false);
  const [earlyWithdrawModal, setEarlyWithdrawModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    start: bigint;
    end: bigint;
    earlyWithdrawFee: bigint;
    symbol?: string;
    poolBalance?: bigint;
  } | null>(null);
  const [withdrawAmountModal, setWithdrawAmountModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    useEarly: boolean;
    symbol?: string;
    maxAmount?: bigint;
  } | null>(null);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string | null>(
    null
  );
  const [transactionProgress, setTransactionProgress] = useState<{
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  } | null>(null);
  const [compoundConfirmation, setCompoundConfirmation] = useState<{
    steps: TransactionStep[];
    fees: FeeInfo[];
    feeErrors?: string[];
    onConfirm: () => void;
  } | null>(null);
  // Ref to track cancellation for claim all and compound operations
  const cancelOperationRef = useRef<(() => void) | null>(null);
  const [isEarningsExpanded, setIsEarningsExpanded] = useState(false);
  const [isClaimAllModalOpen, setIsClaimAllModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMarketForClaim, setSelectedMarketForClaim] = useState<
    string | null
  >("all");
  const [isClaimMarketModalOpen, setIsClaimMarketModalOpen] = useState(false);
  const [contractAddressesModal, setContractAddressesModal] = useState<{
    marketId: string;
    market: any;
    minterAddress: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before showing dynamic content to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get all markets with pegged tokens (we'll filter by collateral balance later)
  const anchorMarkets = useMemo(
    () => Object.entries(markets).filter(([_, m]) => m.peggedToken),
    []
  );

  // Build markets config for volatility protection hook
  const volProtectionMarketsConfig = useMemo(
    () =>
      anchorMarkets.map(([_, m]) => ({
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
        collateralPoolAddress: (m as any).addresses?.stabilityPoolCollateral as
          | `0x${string}`
          | undefined,
        sailPoolAddress: (m as any).addresses?.stabilityPoolLeveraged as
          | `0x${string}`
          | undefined,
      })),
    [anchorMarkets]
  );

  // Fetch volatility protection data for all markets
  const { data: volProtectionData } = useMultipleVolatilityProtection(
    volProtectionMarketsConfig,
    { refetchInterval: 30000 }
  );

  const queryClient = useQueryClient();
  const useAnvil = false;

  // Get projected APR for the primary market (pb-steth)
  const projectedAPR = useProjectedAPR("pb-steth");

  // Fetch anchor ledger marks with real-time estimation (ha tokens + stability pools only, excluding sail tokens)
  const {
    haBalances,
    poolDeposits,
    sailBalances,
    loading: isLoadingAnchorMarks,
  } = useAnchorLedgerMarks();

  // Collect all pool addresses for withdrawal request queries
  const allPoolAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    anchorMarkets.forEach(([_, market]) => {
      if ((market as any).addresses?.stabilityPoolCollateral) {
        addresses.push(
          (market as any).addresses.stabilityPoolCollateral as `0x${string}`
        );
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        addresses.push(
          (market as any).addresses.stabilityPoolLeveraged as `0x${string}`
        );
      }
    });
    return addresses;
  }, [anchorMarkets]);

  // Fetch withdrawal requests for all pools
  const { data: withdrawalRequests = [] } =
    useWithdrawalRequests(allPoolAddresses);

  // Create a map of pool address to reward token symbols
  // We'll query reward tokens for each unique pool and combine them per market group
  const poolToRewardTokens = useMemo(() => {
    const map = new Map<`0x${string}`, string[]>();
    anchorMarkets.forEach(([_, market]) => {
      const collateralPool = (market as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailPool = (market as any).addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;
      if (collateralPool) map.set(collateralPool, []);
      if (sailPool) map.set(sailPool, []);
    });
    return map;
  }, [anchorMarkets]);

  // Calculate anchor marks only (ha tokens + stability pools, excluding sail tokens)
  // Initial calculation using subgraph data (will be recalculated with actual prices after reads is available)
  const totalAnchorMarksInitial = useMemo(() => {
    let totalMarks = 0;

    // Add ha token marks
    if (haBalances) {
      haBalances.forEach((balance) => {
        totalMarks += balance.estimatedMarks;
      });
    }

    // Add stability pool marks
    if (poolDeposits) {
      poolDeposits.forEach((deposit) => {
        totalMarks += deposit.estimatedMarks;
      });
    }

    return totalMarks;
  }, [haBalances, poolDeposits]);

  // Calculate sail marks per day
  const sailMarksPerDay = useMemo(() => {
    if (!sailBalances) return 0;
    return sailBalances.reduce((sum, balance) => sum + balance.marksPerDay, 0);
  }, [sailBalances]);

  // Genesis/maiden voyage marks per day via hook
  const {
    marksPerDay: maidenVoyageMarksPerDay,
    isLoading: isLoadingGenesisMarks,
  } = useGenesisMarks(address);

  // Note: totalMarksPerDay calculation is moved after totalAnchorMarksPerDay is defined (see below)

  // Fetch contract data for all markets
  const allMarketContracts = useMemo(() => {
    return anchorMarkets.flatMap(([_, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      const collateralStabilityPool = (m as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailStabilityPool = (m as any).addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      )
        return [];

      const stabilityPoolManager = (m as any).addresses
        ?.stabilityPoolManager as `0x${string}` | undefined;

      const contracts = [
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "collateralRatio" as const,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "collateralTokenBalance" as const,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "peggedTokenBalance" as const,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "peggedTokenPrice" as const,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "config" as const,
        },
      ];

      // Add rebalanceThreshold from StabilityPoolManager
      if (
        stabilityPoolManager &&
        typeof stabilityPoolManager === "string" &&
        stabilityPoolManager.startsWith("0x") &&
        stabilityPoolManager.length === 42
      ) {
        contracts.push({
          address: stabilityPoolManager,
          abi: stabilityPoolManagerABI,
          functionName: "rebalanceThreshold" as const,
        });
      }

      // Add collateral stability pool data
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      if (
        collateralStabilityPool &&
        typeof collateralStabilityPool === "string" &&
        collateralStabilityPool.startsWith("0x") &&
        collateralStabilityPool.length === 42
      ) {
        contracts.push(
          {
            address: collateralStabilityPool,
            abi: stabilityPoolABI,
            functionName: "totalAssetSupply" as const,
          },
          {
            address: collateralStabilityPool,
            abi: aprABI,
            functionName: "getAPRBreakdown" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: collateralStabilityPool,
            abi: rewardsABI,
            functionName: "getClaimableRewards" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI,
            functionName: "assetBalanceOf" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          }
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI,
            functionName: "rewardData" as const,
            args: [peggedTokenAddress],
          });
        }
      }

      // Add Sail (leveraged) stability pool data
      if (
        sailStabilityPool &&
        typeof sailStabilityPool === "string" &&
        sailStabilityPool.startsWith("0x") &&
        sailStabilityPool.length === 42
      ) {
        contracts.push(
          {
            address: sailStabilityPool,
            abi: stabilityPoolABI,
            functionName: "totalAssetSupply" as const,
          },
          {
            address: sailStabilityPool,
            abi: aprABI,
            functionName: "getAPRBreakdown" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: sailStabilityPool,
            abi: rewardsABI,
            functionName: "getClaimableRewards" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI,
            functionName: "assetBalanceOf" as const,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          }
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI,
            functionName: "rewardData" as const,
            args: [peggedTokenAddress],
          });
        }
      }

      // Add collateral price oracle data for USD calculations
      // IWrappedPriceOracle.latestAnswer() returns (minPrice, maxPrice, minRate, maxRate) - all in 18 decimals
      const collateralPriceOracle = (m as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (
        collateralPriceOracle &&
        typeof collateralPriceOracle === "string" &&
        collateralPriceOracle.startsWith("0x") &&
        collateralPriceOracle.length === 42
      ) {
        contracts.push({
          address: collateralPriceOracle,
          abi: wrappedPriceOracleABI,
          functionName: "latestAnswer" as const,
        });
      }

      // Note: peggedTokenPrice is read from minter contract (peggedTokenPrice() function)
      // No separate oracle needed - the minter calculates it using the collateral price oracle

      return contracts;
    });
  }, [anchorMarkets, address]);

  // ---------------------------------------------------------------------------
  // Fetch pegged / leveraged token addresses from minter (PEGGED_TOKEN / LEVERAGED_TOKEN)
  // Then fetch token name/symbol from the ERC20
  // ---------------------------------------------------------------------------
  const tokenAddressContracts = useMemo(() => {
    const contracts: any[] = [];
    const meta: TokenAddressMeta[] = [];

    anchorMarkets.forEach(([marketId, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      ) {
        return;
      }
      contracts.push({
        address: minter,
        abi: MINTER_ABI,
        functionName: "PEGGED_TOKEN" as const,
      });
      meta.push({ marketId, kind: TOKEN_KIND_PEGGED });

      contracts.push({
        address: minter,
        abi: MINTER_ABI,
        functionName: "LEVERAGED_TOKEN" as const,
      });
      meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED });
    });

    return { contracts, meta };
  }, [anchorMarkets]);

  const { data: tokenAddressReads } = useWagmiContractReads({
    contracts: tokenAddressContracts.contracts,
    query: {
      enabled: tokenAddressContracts.contracts.length > 0,
      staleTime: 300_000, // 5 minutes
    },
  });

  const tokenAddressesByMarket = useMemo(() => {
    const map = new Map<string, TokenMeta>();
    tokenAddressContracts.meta.forEach((meta, idx) => {
      const result = tokenAddressReads?.[idx];
      if (result?.status === "success" && result.result) {
        const addr = result.result as `0x${string}`;
        const entry = map.get(meta.marketId) || {};
        if (meta.kind === TOKEN_KIND_PEGGED) entry.peggedAddress = addr;
        if (meta.kind === TOKEN_KIND_LEVERAGED) entry.leveragedAddress = addr;
        map.set(meta.marketId, entry);
      }
    });
    return map;
  }, [tokenAddressContracts.meta, tokenAddressReads]);

  const tokenMetaContracts = useMemo(() => {
    const contracts: any[] = [];
    const meta: Array<{
      marketId: string;
      kind: TokenKind;
      field: "symbol" | "name";
    }> = [];

    tokenAddressesByMarket.forEach((entry, marketId) => {
      if (entry.peggedAddress) {
        contracts.push({
          address: entry.peggedAddress,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_PEGGED, field: "symbol" });

        contracts.push({
          address: entry.peggedAddress,
          abi: ERC20_ABI,
          functionName: "name" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_PEGGED, field: "name" });
      }

      if (entry.leveragedAddress) {
        contracts.push({
          address: entry.leveragedAddress,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED, field: "symbol" });

        contracts.push({
          address: entry.leveragedAddress,
          abi: ERC20_ABI,
          functionName: "name" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED, field: "name" });
      }
    });

    return { contracts, meta };
  }, [tokenAddressesByMarket]);

  const { data: tokenMetaReads } = useWagmiContractReads({
    contracts: tokenMetaContracts.contracts,
    query: {
      enabled: tokenMetaContracts.contracts.length > 0,
      staleTime: 300_000,
    },
  });

  const tokenMetaByMarket = useMemo(() => {
    const map = new Map<string, TokenMeta>();
    tokenMetaContracts.meta.forEach((meta, idx) => {
      const result = tokenMetaReads?.[idx];
      if (result?.status === "success" && result.result) {
        const entry = map.get(meta.marketId) || {};
        if (meta.kind === TOKEN_KIND_PEGGED) {
          if (meta.field === "symbol")
            entry.peggedSymbol = result.result as string;
          if (meta.field === "name") entry.peggedName = result.result as string;
        } else {
          if (meta.field === "symbol")
            entry.leveragedSymbol = result.result as string;
          if (meta.field === "name")
            entry.leveragedName = result.result as string;
        }
        map.set(meta.marketId, entry);
      }
    });
    return map;
  }, [tokenMetaContracts.meta, tokenMetaReads]);

  // Mutate market config for display so all downstream render logic picks up the correct names/symbols
  useEffect(() => {
    tokenMetaByMarket.forEach((meta, marketId) => {
      const m = (markets as any)[marketId];
      if (!m) return;
      if (meta.peggedSymbol || meta.peggedName) {
        m.peggedToken = {
          ...(m.peggedToken || {}),
          symbol: meta.peggedSymbol || m.peggedToken?.symbol,
          name: meta.peggedName || m.peggedToken?.name,
        };
      }
      if (meta.leveragedSymbol || meta.leveragedName) {
        m.leveragedToken = {
          ...(m.leveragedToken || {}),
          symbol: meta.leveragedSymbol || m.leveragedToken?.symbol,
          name: meta.leveragedName || m.leveragedToken?.name,
        };
      }
    });
  }, [tokenMetaByMarket]);

  const wagmiMarketReads = useContractReads({
    contracts: allMarketContracts,
    query: {
      enabled: anchorMarkets.length > 0 && !useAnvil,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });

  const anvilMarketReads = useContractReads({
    contracts: allMarketContracts,
    enabled: anchorMarkets.length > 0 && useAnvil,
    refetchInterval: POLLING_INTERVALS.FAST,
  });

  const reads = useAnvil ? anvilMarketReads.data : wagmiMarketReads.data;
  const refetchReads = useAnvil
    ? anvilMarketReads.refetch
    : wagmiMarketReads.refetch;

  // Recalculate anchor marks per day using actual peggedTokenPrice from minter contract
  // Also recalculate totalAnchorMarks directly from haBalances and poolDeposits for real-time updates
  // Use useState + useEffect to ensure component re-renders when marks change every second
  const [totalAnchorMarksState, setTotalAnchorMarksState] = useState(0);

  // Update marks state whenever arrays change (they update every second via currentTime in the hook)
  useEffect(() => {
    // Recalculate total marks directly from arrays (which update every second)
    let totalMarks = 0;
    if (haBalances) {
      haBalances.forEach((balance) => {
        totalMarks += balance.estimatedMarks;
      });
    }
    if (poolDeposits) {
      poolDeposits.forEach((deposit) => {
        totalMarks += deposit.estimatedMarks;
      });
    }

    setTotalAnchorMarksState(totalMarks);
  }, [haBalances, poolDeposits]);

  const { totalAnchorMarks, totalAnchorMarksPerDay } = useMemo(() => {
    const totalMarks = totalAnchorMarksState;
    let totalPerDay = 0;

    // Create a map of pegged token address to peggedTokenPrice
    // Find peggedTokenPrice by matching contract address and functionName in allMarketContracts
    const tokenToPriceMap = new Map<string, bigint | undefined>();
    if (allMarketContracts && reads) {
      anchorMarkets.forEach(([_, m]) => {
        const peggedTokenAddress = (m as any).addresses?.peggedToken as
          | string
          | undefined;
        const minterAddress = (m as any).addresses?.minter as
          | string
          | undefined;
        if (peggedTokenAddress && minterAddress) {
          // Find the peggedTokenPrice read by matching minter address and functionName
          const peggedTokenPriceIndex = allMarketContracts.findIndex(
            (contract, index) =>
              contract.address?.toLowerCase() === minterAddress.toLowerCase() &&
              contract.functionName === "peggedTokenPrice" &&
              reads[index]?.status === "success"
          );
          const peggedTokenPrice =
            peggedTokenPriceIndex >= 0 &&
            reads[peggedTokenPriceIndex]?.status === "success"
              ? (reads[peggedTokenPriceIndex].result as bigint)
              : undefined;
          tokenToPriceMap.set(
            peggedTokenAddress.toLowerCase(),
            peggedTokenPrice
          );
        }
      });
    }

    // Add ha token marks - recalculate marksPerDay using actual peggedTokenPrice
    if (haBalances) {
      haBalances.forEach((balance) => {
        // Recalculate marksPerDay using actual peggedTokenPrice
        const peggedTokenPrice = tokenToPriceMap.get(
          balance.tokenAddress.toLowerCase()
        );
        if (peggedTokenPrice) {
          // peggedTokenPrice is in 18 decimals, where 1e18 = $1.00 normally
          // But for tokens pegged to ETH/BTC, it will be different
          const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
          const balanceNum = parseFloat(balance.balance);
          const balanceUSD = balanceNum * peggedPriceUSD;
          // 1 mark per dollar per day
          totalPerDay += balanceUSD;
        } else {
          // Fallback to subgraph value if we can't find the price
          totalPerDay += balance.marksPerDay;
        }
      });
    }

    // Add stability pool marks - recalculate marksPerDay using actual peggedTokenPrice
    if (poolDeposits) {
      poolDeposits.forEach((deposit) => {
        // For stability pools, we need to find which market this pool belongs to
        // and get the peggedTokenPrice for that market
        let poolPeggedTokenPrice: bigint | undefined;
        anchorMarkets.forEach(([_, m]) => {
          const collateralPool = (
            m as any
          ).addresses?.stabilityPoolCollateral?.toLowerCase();
          const sailPool = (
            m as any
          ).addresses?.stabilityPoolLeveraged?.toLowerCase();
          if (
            deposit.poolAddress.toLowerCase() === collateralPool ||
            deposit.poolAddress.toLowerCase() === sailPool
          ) {
            const peggedTokenAddress = (m as any).addresses?.peggedToken as
              | string
              | undefined;
            if (peggedTokenAddress) {
              poolPeggedTokenPrice = tokenToPriceMap.get(
                peggedTokenAddress.toLowerCase()
              );
            }
          }
        });

        if (poolPeggedTokenPrice) {
          // Stability pool deposits are in ha tokens, so use peggedTokenPrice
          const peggedPriceUSD = Number(poolPeggedTokenPrice) / 1e18;
          const balanceNum = parseFloat(deposit.balance);
          const balanceUSD = balanceNum * peggedPriceUSD;
          // 1 mark per dollar per day
          totalPerDay += balanceUSD;
        } else {
          // Fallback to subgraph value if we can't find the price
          totalPerDay += deposit.marksPerDay;
        }
      });
    }

    return {
      totalAnchorMarks: totalMarks,
      totalAnchorMarksPerDay: totalPerDay,
    };
  }, [
    totalAnchorMarksState,
    haBalances,
    poolDeposits,
    anchorMarkets,
    allMarketContracts,
    reads,
  ]);

  // Calculate total marks per day (after totalAnchorMarksPerDay is defined)
  const totalMarksPerDay = useMemo(() => {
    return totalAnchorMarksPerDay + sailMarksPerDay + maidenVoyageMarksPerDay;
  }, [totalAnchorMarksPerDay, sailMarksPerDay, maidenVoyageMarksPerDay]);

  // Fetch user's pegged token balances for all markets
  // Create a map of market index to contract index for proper lookup
  const userDepositContracts = useMemo(() => {
    return anchorMarkets
      .map(([_, m], index) => {
        const peggedTokenAddress = (m as any).addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        if (
          !peggedTokenAddress ||
          typeof peggedTokenAddress !== "string" ||
          !peggedTokenAddress.startsWith("0x") ||
          peggedTokenAddress.length !== 42 ||
          !address
        )
          return null;
        return {
          marketIndex: index,
          contract: {
            address: peggedTokenAddress,
            abi: erc20ABI,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [anchorMarkets, address]);

  const userDepositContractArray = useMemo(() => {
    return userDepositContracts.map((c) => c.contract);
  }, [userDepositContracts]);

  const wagmiUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: anchorMarkets.length > 0 && !!address && !useAnvil,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });

  const anvilUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    enabled: anchorMarkets.length > 0 && !!address && useAnvil,
    refetchInterval: POLLING_INTERVALS.FAST,
  });

  const userDepositReads = useAnvil
    ? anvilUserDepositReads.data
    : wagmiUserDepositReads.data;
  const refetchUserDeposits = useAnvil
    ? anvilUserDepositReads.refetch
    : wagmiUserDepositReads.refetch;

  // Execute a pending withdrawal (fee-free when window is open, fee when not)
  const handlePendingWithdraw = async (
    poolAddress: `0x${string}`,
    poolType: "collateral" | "sail",
    useEarly: boolean,
    amount?: bigint
  ) => {
    if (!address) return;
    const client = false ? publicClient : publicClient;
    if (!client) return;

    // For fee-free withdrawals, require an amount
    if (!useEarly && amount === undefined) return;

    setTransactionProgress({
      isOpen: true,
      title: useEarly ? "Early Withdraw" : "Withdraw",
      steps: [
        {
          id: "withdraw",
          label: useEarly ? "Withdraw (fee applies)" : "Withdraw",
          status: "in_progress",
        },
      ],
      currentStepIndex: 0,
    });

    try {
      const fn = useEarly ? "withdrawEarly" : "withdraw";
      const args = useEarly
        ? [address as `0x${string}`, 0n]
        : [amount as bigint, address as `0x${string}`, 0n];

      const tx = await writeContractAsync({
        address: poolAddress,
        abi: STABILITY_POOL_ABI,
        functionName: fn,
        args,
      });

      await client.waitForTransactionReceipt({ hash: tx });
      await Promise.allSettled([refetchReads(), refetchUserDeposits()]);
    } catch (err) {
      console.error("Pending withdraw error", err);
    } finally {
      setTransactionProgress(null);
      setEarlyWithdrawModal(null);
    }
  };

  // Create a map for quick lookup: marketIndex -> deposit balance
  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      map.set(
        marketIndex,
        userDepositReads?.[contractIndex]?.result as bigint | undefined
      );
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  // Build pools array for useAllStabilityPoolRewards
  const allPoolsForRewards = useMemo(() => {
    if (!reads) return [];

    const pools: Array<{
      address: `0x${string}`;
      poolType: "collateral" | "sail";
      marketId: string;
      peggedTokenPrice: bigint | undefined;
      collateralPrice: bigint | undefined;
      collateralPriceDecimals: number | undefined;
      peggedTokenAddress: `0x${string}` | undefined;
      collateralTokenAddress: `0x${string}` | undefined;
    }> = [];

    anchorMarkets.forEach(([id, m], mi) => {
      const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
      const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
      const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
      const hasStabilityPoolManager = !!(m as any).addresses
        ?.stabilityPoolManager;

      // Calculate offset for this market
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
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      const collateralTokenAddress = (m as any).collateral?.address as
        | `0x${string}`
        | undefined;

      // Get collateral price and decimals
      let collateralPrice: bigint | undefined;
      // IWrappedPriceOracle always returns prices in 18 decimals
      const collateralPriceDecimals: number = 18;
      if (hasPriceOracle) {
        let priceOracleOffset = baseOffset + 5; // 4 minter + 1 config
        if (hasStabilityPoolManager) priceOracleOffset += 1; // rebalanceThreshold
        if (hasCollateralPool) {
          priceOracleOffset += 4; // 4 pool reads
          if (peggedTokenAddress) priceOracleOffset += 1; // rewardData
        }
        if (hasSailPool) {
          priceOracleOffset += 4; // 4 pool reads
          if (peggedTokenAddress) priceOracleOffset += 1; // rewardData
        }
        // latestAnswer returns a tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
        // Use maxUnderlyingPrice (index 1) as the price
        // Handle both array format and object format (viem can return either)
        const latestAnswerResult = reads?.[priceOracleOffset]?.result;
        if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          if (Array.isArray(latestAnswerResult)) {
            collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice is at index 1
          } else if (typeof latestAnswerResult === "object") {
            // Handle named tuple object format
            const objResult = latestAnswerResult as {
              maxUnderlyingPrice?: bigint;
              [key: string]: unknown;
            };
            if (objResult.maxUnderlyingPrice !== undefined) {
              collateralPrice = objResult.maxUnderlyingPrice;
            }
          } else if (typeof latestAnswerResult === "bigint") {
            // Single value format (standard Chainlink)
            collateralPrice = latestAnswerResult;
          }
        }
      }

      const currentOffset = baseOffset + 5 + (hasStabilityPoolManager ? 1 : 0);

      if (hasCollateralPool) {
        const collateralPoolAddress = (m as any).addresses
          ?.stabilityPoolCollateral as `0x${string}`;
        pools.push({
          address: collateralPoolAddress,
          poolType: "collateral",
          marketId: id,
          peggedTokenPrice,
          collateralPrice,
          collateralPriceDecimals,
          peggedTokenAddress,
          collateralTokenAddress,
        });
      }

      if (hasSailPool) {
        const sailPoolAddress = (m as any).addresses
          ?.stabilityPoolLeveraged as `0x${string}`;
        pools.push({
          address: sailPoolAddress,
          poolType: "sail",
          marketId: id,
          peggedTokenPrice,
          collateralPrice,
          collateralPriceDecimals,
          peggedTokenAddress,
          collateralTokenAddress,
        });
      }
    });

    return pools;
  }, [anchorMarkets, reads]);

  // Build global token price map for all reward tokens
  const globalTokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();

    // Iterate through all markets to collect token prices
    anchorMarkets.forEach(([id, m], mi) => {
      const hasPriceOracle = !!(m as any).addresses?.collateralPrice;

      // Calculate offset for this market (same logic as allPoolsForRewards)
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
        offset += 5; // 4 minter calls + 1 config call
        if (prevHasStabilityPoolManager) offset += 1;
        if (prevHasCollateral) {
          offset += 4;
          if (prevPeggedTokenAddress) offset += 1;
        }
        if (prevHasSail) {
          offset += 4;
          if (prevPeggedTokenAddress) offset += 1;
        }
        if (prevHasPriceOracle) offset += 1;
      }

      const baseOffset = offset;
      const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
        | bigint
        | undefined;
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      const collateralTokenAddress = (m as any).addresses?.collateralToken as
        | `0x${string}`
        | undefined;

      // Add pegged token price
      if (peggedTokenAddress && peggedTokenPrice) {
        const price = Number(peggedTokenPrice) / 1e18;
        map.set(peggedTokenAddress.toLowerCase(), price);
      }

      // Add collateral token price
      if (hasPriceOracle && collateralTokenAddress) {
        let priceOracleOffset = baseOffset + 5;
        const hasStabilityPoolManager = !!(m as any).addresses
          ?.stabilityPoolManager;
        const hasCollateralPool = !!(m as any).addresses
          ?.stabilityPoolCollateral;
        const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
        if (hasStabilityPoolManager) priceOracleOffset += 1;
        if (hasCollateralPool) {
          priceOracleOffset += 4;
          if (peggedTokenAddress) priceOracleOffset += 1;
        }
        if (hasSailPool) {
          priceOracleOffset += 4;
          if (peggedTokenAddress) priceOracleOffset += 1;
        }
        // IWrappedPriceOracle always returns prices in 18 decimals
        const collateralPriceDecimals = 18;
        // latestAnswer returns a tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
        // Use maxUnderlyingPrice (index 1) as the price
        // Handle both array format and object format (viem can return either)
        const latestAnswerResult = reads?.[priceOracleOffset]?.result;
        let collateralPrice: bigint | undefined;
        if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          if (Array.isArray(latestAnswerResult)) {
            collateralPrice = latestAnswerResult[1] as bigint;
          } else if (typeof latestAnswerResult === "object") {
            const objResult = latestAnswerResult as {
              maxUnderlyingPrice?: bigint;
              [key: string]: unknown;
            };
            if (objResult.maxUnderlyingPrice !== undefined) {
              collateralPrice = objResult.maxUnderlyingPrice;
            }
          } else if (typeof latestAnswerResult === "bigint") {
            collateralPrice = latestAnswerResult;
          }
        }

        if (collateralPrice) {
          const price = Number(collateralPrice) / 10 ** collateralPriceDecimals;
          map.set(collateralTokenAddress.toLowerCase(), price);

          // Also add wstETH if it's a different address
          const wstETHAddress = (m as any).addresses?.wstETH as
            | `0x${string}`
            | undefined;
          if (
            wstETHAddress &&
            wstETHAddress.toLowerCase() !== collateralTokenAddress.toLowerCase()
          ) {
            map.set(wstETHAddress.toLowerCase(), price);
          }
        }
      }
    });

    return map;
  }, [anchorMarkets, reads]);

  // Fetch all stability pool rewards
  const { data: allPoolRewards = [], isLoading: isLoadingAllRewards } =
    useAllStabilityPoolRewards({
      pools: allPoolsForRewards,
      tokenPriceMap: globalTokenPriceMap,
      enabled: !!reads && allPoolsForRewards.length > 0,
    });

  // Create a map for quick lookup: poolAddress -> rewards
  const poolRewardsMap = useMemo(() => {
    const map = new Map<`0x${string}`, (typeof allPoolRewards)[0]>();
    allPoolRewards.forEach((poolReward) => {
      map.set(poolReward.poolAddress, poolReward);
    });
    return map;
  }, [allPoolRewards]);

  // Build market configs for positions hook
  const marketPositionConfigs = useMemo(() => {
    return anchorMarkets.map(([id, m]) => {
      const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
      const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
      const peggedTokenAddress = (m as any)?.addresses?.peggedToken as
        | `0x${string}`
        | undefined;

      return {
        marketId: id,
        peggedTokenAddress,
        collateralPoolAddress: hasCollateralPool
          ? ((m as any).addresses?.stabilityPoolCollateral as `0x${string}`)
          : undefined,
        sailPoolAddress: hasSailPool
          ? ((m as any).addresses?.stabilityPoolLeveraged as `0x${string}`)
          : undefined,
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
      };
    });
  }, [anchorMarkets]);

  // Build a fallback price map from the existing reads (per-market peggedTokenPrice)
  const peggedPricesFromReads = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    if (!reads) return map;

    anchorMarkets.forEach(([id, m], mi) => {
      // Recompute offset for this market (aligns with the reads order above)
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
      const priceRead = reads?.[baseOffset + 3];
      if (
        priceRead &&
        priceRead.result !== undefined &&
        priceRead.result !== null
      ) {
        map[id] = priceRead.result as bigint;
      }
    });

    return map;
  }, [anchorMarkets, reads]);

  // Fetch pegged token prices using the new unified hook
  const tokenPriceInputs = useMemo(() => {
    return marketPositionConfigs.map((c) => {
      // Find the market to get pegTarget
      const market = anchorMarkets.find(([id]) => id === c.marketId)?.[1];
      return {
        marketId: c.marketId,
        minterAddress: c.minterAddress!,
        pegTarget: (market as any)?.pegTarget || "USD",
      };
    }).filter((c) => c.minterAddress); // Filter out markets without minter
  }, [marketPositionConfigs, anchorMarkets]);
  
  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  const mergedPeggedPriceMap = useMemo(() => {
    const out: Record<string, bigint | undefined> = {};
    
    Object.entries(tokenPricesByMarket).forEach(([id, priceData]) => {
      if (!priceData.isLoading && !priceData.error && priceData.peggedBackingRatio > 0) {
        // Try to use the full USD price if CoinGecko worked
        if (priceData.peggedPriceUSD > 0) {
          out[id] = BigInt(Math.floor(priceData.peggedPriceUSD * 1e18));
        } else {
          // CoinGecko failed - calculate using collateral price oracle instead
          // Find the market to get collateral info
          const market = anchorMarkets.find(([marketId]) => marketId === id)?.[1];
          const collateralAddress = (market as any)?.collateral?.address?.toLowerCase();
          
          if (collateralAddress && globalTokenPriceMap.has(collateralAddress)) {
            const collateralPriceUSD = globalTokenPriceMap.get(collateralAddress) || 0;
            
            if (collateralPriceUSD > 0) {
              // haTokenPriceUSD = peggedBackingRatio × collateralPriceUSD
              // For haETH: 1.0 × $3500 = $3500
              // For haBTC: 1.0 × $100000 = $100000
              const haTokenPriceUSD = priceData.peggedBackingRatio * collateralPriceUSD;
              out[id] = BigInt(Math.floor(haTokenPriceUSD * 1e18));
            }
          }
        }
      }
    });
    
    // Fall back to prices from contract reads for any markets still missing prices
    Object.entries(peggedPricesFromReads).forEach(([id, price]) => {
      if (!out[id] && price) {
        out[id] = price;
      }
    });
    
    return out;
  }, [peggedPricesFromReads, tokenPricesByMarket, anchorMarkets, globalTokenPriceMap]);

  // Fetch all positions using the unified hook, passing shared prices
  const {
    positionsMap: marketPositions,
    totalPositionUSD: allMarketsTotalPositionUSD,
    hasPositions: userHasPositions,
    refetch: refetchPositions,
  } = useMarketPositions(marketPositionConfigs, address, mergedPeggedPriceMap);

  // Group markets by peggedToken.symbol (for grouping ha tokens)
  const groupedMarkets = useMemo(() => {
    if (!reads) return null;

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

    // Calculate combined stats and find best market/pool for each group
    const groupedData: Array<{
      symbol: string;
      markets: Array<{ marketId: string; market: any; marketIndex: number }>;
      bestMarketId: string;
      bestMarket: any;
      bestMarketIndex: number;
      bestPoolType: "collateral" | "sail";
      combinedAPR: number;
      combinedRewardsUSD: number;
      combinedPositionUSD: number;
      collateralSymbol: string;
      hasStabilityPoolDeposits: boolean;
      hasHaTokens: boolean;
    }> = [];

    Object.entries(groups).forEach(([symbol, marketList]) => {
      let bestAPR = 0;
      let bestMarketId = marketList[0].marketId;
      let bestMarket = marketList[0].market;
      let bestMarketIndex = marketList[0].marketIndex;
      let bestPoolType: "collateral" | "sail" = "collateral";
      let totalRewardsUSD = 0;
      let totalPositionUSD = 0;
      let collateralSymbol = "";
      let hasStabilityPoolDeposits = false;
      let hasHaTokens = false;

      marketList.forEach(({ marketId, market, marketIndex }) => {
        const hasCollateralPool = !!(market as any).addresses
          ?.stabilityPoolCollateral;
        const hasSailPool = !!(market as any).addresses?.stabilityPoolLeveraged;

        // Calculate offset for this market
        let offset = 0;
        for (let i = 0; i < marketIndex; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses
            ?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses
            ?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses
            ?.collateralPrice;
          const prevHasStabilityPoolManager = !!(prevMarket as any).addresses
            ?.stabilityPoolManager;
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
        let collateralPoolAPR:
          | { collateral: number; steam: number }
          | undefined;
        let sailPoolAPR: { collateral: number; steam: number } | undefined;
        let collateralPoolRewards: bigint | undefined;
        let sailPoolRewards: bigint | undefined;
        let collateralPoolDeposit: bigint | undefined;
        let sailPoolDeposit: bigint | undefined;

        if (hasCollateralPool) {
          const collateralAPRResult = reads?.[currentOffset + 1]?.result as
            | [bigint, bigint]
            | undefined;
          collateralPoolAPR = collateralAPRResult
            ? {
                collateral: (Number(collateralAPRResult[0]) / 1e16) * 100,
                steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
              }
            : undefined;
          collateralPoolRewards = reads?.[currentOffset + 2]?.result as
            | bigint
            | undefined;
          collateralPoolDeposit = reads?.[currentOffset + 3]?.result as
            | bigint
            | undefined;
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
          sailPoolRewards = reads?.[currentOffset + 2]?.result as
            | bigint
            | undefined;
          sailPoolDeposit = reads?.[currentOffset + 3]?.result as
            | bigint
            | undefined;
          currentOffset += 4;
        }

        // Get price oracle for USD calculations
        // IWrappedPriceOracle.latestAnswer() returns (minPrice, maxPrice, minRate, maxRate) - all in 18 decimals
        const hasPriceOracle = !!(market as any).addresses?.collateralPrice;
        const collateralPriceDecimals = 18;
        let collateralPrice: bigint | undefined;
        if (hasPriceOracle) {
          const latestAnswerResult = reads?.[currentOffset]?.result;
          if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
            if (Array.isArray(latestAnswerResult)) {
              collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice
            } else if (typeof latestAnswerResult === "object") {
              const obj = latestAnswerResult as { maxUnderlyingPrice?: bigint };
              collateralPrice = obj.maxUnderlyingPrice;
            } else if (typeof latestAnswerResult === "bigint") {
              collateralPrice = latestAnswerResult;
            }
          }
        }

        // Calculate APRs
        const collateralTotalAPR = collateralPoolAPR
          ? (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0)
          : 0;
        const sailTotalAPR = sailPoolAPR
          ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
          : 0;

        // Find best APR
        if (collateralTotalAPR > bestAPR) {
          bestAPR = collateralTotalAPR;
          bestMarketId = marketId;
          bestMarket = market;
          bestMarketIndex = marketIndex;
          bestPoolType = "collateral";
        }
        if (sailTotalAPR > bestAPR) {
          bestAPR = sailTotalAPR;
          bestMarketId = marketId;
          bestMarket = market;
          bestMarketIndex = marketIndex;
          bestPoolType = "sail";
        }

        // Calculate rewards USD
        if (
          collateralPoolRewards &&
          collateralPrice &&
          collateralPriceDecimals !== undefined
        ) {
          const price =
            Number(collateralPrice) /
            10 ** (Number(collateralPriceDecimals) || 8);
          const collateralAmount = Number(collateralPoolRewards) / 1e18;
          totalRewardsUSD += collateralAmount * price;
        }
        if (
          sailPoolRewards &&
          peggedTokenPrice &&
          collateralPrice &&
          collateralPriceDecimals !== undefined
        ) {
          const peggedPrice = Number(peggedTokenPrice) / 1e18;
          const collateralPriceNum =
            Number(collateralPrice) /
            10 ** (Number(collateralPriceDecimals) || 8);
          const leveragedAmount = Number(sailPoolRewards) / 1e18;
          totalRewardsUSD +=
            leveragedAmount * (peggedPrice * collateralPriceNum);
        }

        // Get position data from unified hook
        const position = marketPositions[marketId];

        if (position) {
          // Track position USD from hook
          if (position.collateralPool > 0n) {
            hasStabilityPoolDeposits = true;
          }
          if (position.sailPool > 0n) {
            hasStabilityPoolDeposits = true;
          }
          if (position.walletHa > 0n) {
            hasHaTokens = true;
          }
          // Use totalUSD from hook (includes wallet + both pools)
          totalPositionUSD += position.totalUSD || 0;
        }

        if (!collateralSymbol && market.collateral?.symbol) {
          collateralSymbol = market.collateral.symbol;
        }
      });

      groupedData.push({
        symbol,
        markets: marketList,
        bestMarketId,
        bestMarket,
        bestMarketIndex,
        bestPoolType,
        combinedAPR: bestAPR,
        combinedRewardsUSD: totalRewardsUSD,
        combinedPositionUSD: totalPositionUSD,
        collateralSymbol,
        hasStabilityPoolDeposits,
        hasHaTokens,
      });
    });

    return groupedData;
  }, [reads, anchorMarkets, marketPositions]);

  // Claim and compound handlers
  const updateProgressStep = (
    stepId: string,
    updates: Partial<TransactionStep>
  ) => {
    setTransactionProgress((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        ),
      };
    });
  };

  const setCurrentStep = (stepIndex: number) => {
    setTransactionProgress((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStepIndex: stepIndex,
      };
    });
  };

  // Helper function to check if error is due to user rejection
  const isUserRejection = (error: any): boolean => {
    if (!error) return false;
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code;

    // Check for common rejection messages
    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("user denied") ||
      errorMessage.includes("rejected") ||
      errorMessage.includes("denied") ||
      errorMessage.includes("action rejected") ||
      errorMessage.includes("user cancelled") ||
      errorMessage.includes("user canceled")
    ) {
      return true;
    }

    // Check for common rejection error codes
    // 4001 = MetaMask user rejection, 4900 = Uniswap user rejection, etc.
    if (errorCode === 4001 || errorCode === 4900) {
      return true;
    }

    return false;
  };

  const handleClaimRewards = async (
    market: any,
    poolType: "collateral" | "sail"
  ) => {
    if (!address) return;
    const poolAddress =
      poolType === "collateral"
        ? (market.addresses?.stabilityPoolCollateral as
            | `0x${string}`
            | undefined)
        : (market.addresses?.stabilityPoolLeveraged as
            | `0x${string}`
            | undefined);

    if (!poolAddress) return;

    const marketSymbol = market.peggedToken?.symbol || market.id;
    const poolName = `${marketSymbol} ${poolType} pool`;

    // Initialize progress modal
    const steps: TransactionStep[] = [
      {
        id: "claim",
        label: `Claim rewards from ${poolName}`,
        status: "pending",
      },
    ];

    setTransactionProgress({
      isOpen: true,
      title: "Claiming Rewards",
      steps,
      currentStepIndex: 0,
    });

    try {
      setIsClaiming(true);
      setCurrentStep(0);
      updateProgressStep("claim", { status: "in_progress" });

      // Call claim() directly on the Stability Pool contract
      // Use rewardsABI which has the claim function
      const hash = await writeContractAsync({
        address: poolAddress,
        abi: rewardsABI,
        functionName: "claim",
      });

      updateProgressStep("claim", {
        status: "in_progress",
        txHash: hash as string,
        details: "Waiting for transaction confirmation...",
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      updateProgressStep("claim", {
        status: "completed",
        txHash: hash as string,
        details: "Transaction confirmed",
      });

      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (error: any) {
      const errorMessage = isUserRejection(error)
        ? "User declined the transaction"
        : error.message || "Transaction failed";
      updateProgressStep("claim", {
        status: "error",
        error: errorMessage,
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCompoundRewards = (
    market: any,
    poolType: "collateral" | "sail",
    rewardAmount: bigint
  ) => {
    // Show pool selection modal instead of directly calling handleCompoundConfirm
    const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;

    // Get pegged token price for TVL calculation
    // Find the market in anchorMarkets to get peggedTokenPrice from reads
    let peggedTokenPrice: bigint | undefined;
    const marketIndex = anchorMarkets.findIndex(
      ([id]) => id === market.id || (market as any).addresses?.peggedToken
    );
    if (marketIndex >= 0 && reads) {
      // Calculate offset to get peggedTokenPrice
      let offset = 0;
      for (let i = 0; i < marketIndex; i++) {
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
        offset += 5; // 4 minter calls + 1 config call
        if (prevHasStabilityPoolManager) offset += 1;
        if (prevHasCollateral) {
          offset += 4;
          if (prevPeggedTokenAddress) offset += 1;
        }
        if (prevHasSail) {
          offset += 4;
          if (prevPeggedTokenAddress) offset += 1;
        }
        if (prevHasPriceOracle) offset += 1;
      }
      peggedTokenPrice = reads?.[offset + 3]?.result as bigint | undefined;
    }

    const pools: PoolOption[] = [];

    if (collateralPoolAddress) {
      // Get APR and TVL for collateral pool if available
      const collateralPoolData = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === collateralPoolAddress.toLowerCase()
      );
      const collateralPoolAPR = collateralPoolData?.totalAPR;

      // Calculate TVL USD from pool data if available
      let collateralTVLUSD: number | undefined;
      if (collateralPoolData?.tvl !== undefined && peggedTokenPrice) {
        const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
        const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
        collateralTVLUSD = tvlTokens * peggedPriceUSD;
      }

      pools.push({
        id: "collateral",
        name: `${market.peggedToken?.symbol || market.id} Collateral Pool`,
        address: collateralPoolAddress,
        apr: collateralPoolAPR,
        tvl: collateralPoolData?.tvl,
        tvlUSD: collateralTVLUSD,
        enabled: true,
      });
    }

    if (sailPoolAddress) {
      // Get APR and TVL for sail pool if available
      const sailPoolData = allPoolRewards?.find(
        (r) => r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase()
      );
      const sailPoolAPR = sailPoolData?.totalAPR;

      // Calculate TVL USD from pool data if available
      let sailTVLUSD: number | undefined;
      if (sailPoolData?.tvl !== undefined && peggedTokenPrice) {
        const tvlTokens = Number(sailPoolData.tvl) / 1e18;
        const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
        sailTVLUSD = tvlTokens * peggedPriceUSD;
      }

      pools.push({
        id: "sail",
        name: `${market.peggedToken?.symbol || market.id} Sail Pool`,
        address: sailPoolAddress,
        apr: sailPoolAPR,
        tvl: sailPoolData?.tvl,
        tvlUSD: sailTVLUSD,
        enabled: true,
      });
    }

    if (pools.length === 0) {
      // No pools available, show error or fallback
      return;
    }

    setCompoundPoolSelection({
      market,
      pools,
    });
  };

  // Create handlers for AnchorMarketExpandedView compound buttons
  const createCompoundHandlers = (market: any) => {
    return {
      onCompoundCollateralRewards: () => {
        const rewardAmount =
          collateralPoolRewardsData.claimableValue > 0
            ? BigInt(
                Math.floor(collateralPoolRewardsData.claimableValue * 1e18)
              )
            : 0n;
        handleCompoundRewards(market, "collateral", rewardAmount);
      },
      onCompoundSailRewards: () => {
        const rewardAmount =
          sailPoolRewardsData.claimableValue > 0
            ? BigInt(Math.floor(sailPoolRewardsData.claimableValue * 1e18))
            : 0n;
        handleCompoundRewards(market, "sail", rewardAmount);
      },
    };
  };

  const handleCompoundConfirm = async (
    market: any,
    allocations: Array<{ poolId: "collateral" | "sail"; percentage: number }>,
    rewardAmount: bigint
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
    const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;
    const collateralAddress = market.addresses?.collateralToken as
      | `0x${string}`
      | undefined;
    const peggedTokenAddress = market.addresses?.peggedToken as
      | `0x${string}`
      | undefined;
    const leveragedTokenAddress = market.addresses?.leveragedToken as
      | `0x${string}`
      | undefined;

    if (!minterAddress || !address) {
      throw new Error("Missing required addresses");
    }

    const marketSymbol = market.peggedToken?.symbol || market.id;
    const collateralSymbol =
      market.collateralToken?.symbol ||
      market.collateral?.symbol ||
      "collateral";
    const leveragedSymbol =
      market.leveragedToken?.symbol || market.sail?.symbol || "sail";

    // Validate allocations
    if (allocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Filter allocations to only include pools with percentage > 0
    const activeAllocations = allocations.filter((a) => a.percentage > 0);
    if (activeAllocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Get pool addresses for ALL pools that have rewards - we'll claim from each one
    interface PoolWithRewards {
      poolType: "collateral" | "sail";
      poolAddress: `0x${string}`;
      rewards: {
        poolAddress: string;
        rewardTokens?: Array<{
          address: string;
          symbol: string;
          claimable: bigint;
        }>;
      };
    }
    const poolsWithRewards: PoolWithRewards[] = [];

    if (collateralPoolAddress) {
      const collateralRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === collateralPoolAddress.toLowerCase() &&
          r.rewardTokens.some((rt) => rt.claimable > 0n)
      );
      if (collateralRewards) {
        poolsWithRewards.push({
          poolType: "collateral",
          poolAddress: collateralPoolAddress,
          rewards: collateralRewards,
        });
      }
    }
    if (sailPoolAddress) {
      const sailRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase() &&
          r.rewardTokens.some((rt) => rt.claimable > 0n)
      );
      if (sailRewards) {
        poolsWithRewards.push({
          poolType: "sail",
          poolAddress: sailPoolAddress,
          rewards: sailRewards,
        });
      }
    }

    if (poolsWithRewards.length === 0) {
      throw new Error("No pools with claimable rewards found");
    }

    if (!collateralAddress || !peggedTokenAddress) {
      throw new Error("Missing required token addresses");
    }

    // Initialize progress modal early to show errors if they occur
    const initialSteps: TransactionStep[] = [
      {
        id: "setup",
        label: "Setting up compound process...",
        status: "in_progress",
      },
    ];

    setTransactionProgress({
      isOpen: true,
      title: "Compounding Rewards",
      steps: initialSteps,
      currentStepIndex: 0,
    });

    // Track if the process has been cancelled (defined outside try block so it's accessible everywhere)
    const cancelRef = { current: false };

    // Declare variables outside try blocks so they're accessible in both setup and execution phases
    let steps: TransactionStep[] = [];
    let leveragedReceived = 0n;
    let totalCollateralForMinting = 0n;
    let collateralReceived = 0n;
    let haReceived = 0n;
    let expectedOutput: bigint | undefined;

    // Interface for categorized rewards (declared here for type access in both blocks)
    interface CategorizedReward {
      address: `0x${string}`;
      symbol: string;
      amount: bigint;
      type: "collateral" | "ha" | "hs";
    }
    let categorizedRewards: CategorizedReward[] = [];

    try {
      // Step 1: Get claimable rewards from ALL pools that have rewards
      if (!allPoolRewards || allPoolRewards.length === 0) {
        throw new Error(
          "Rewards data not loaded yet. Please wait and try again."
        );
      }

      // Aggregate rewards from ALL pools
      const allClaimableRewards: Array<{
        address: `0x${string}`;
        symbol: string;
        claimable: bigint;
      }> = [];

      poolsWithRewards.forEach((pool) => {
        if (pool.rewards?.rewardTokens) {
          pool.rewards.rewardTokens.forEach((rt) => {
            if (rt.claimable > 0n) {
              // Check if we already have this token, if so add to it
              const existing = allClaimableRewards.find(
                (r) => r.address.toLowerCase() === rt.address.toLowerCase()
              );
              if (existing) {
                existing.claimable += rt.claimable;
              } else {
                allClaimableRewards.push({
                  address: rt.address as `0x${string}`,
                  symbol: rt.symbol,
                  claimable: rt.claimable,
                });
              }
            }
          });
        }
      });

      if (allClaimableRewards.length === 0) {
        updateProgressStep("setup", {
          status: "error",
          error: "No rewards available to compound",
        });
        throw new Error("No rewards available to compound");
      }

      // Categorize reward tokens by type (collateral, ha, hs)
      categorizedRewards = allClaimableRewards.map((r) => {
        const tokenLower = r.address.toLowerCase();
        let tokenType: "collateral" | "ha" | "hs" = "collateral";

        // Check if it's the collateral token
        if (
          collateralAddress &&
          tokenLower === collateralAddress.toLowerCase()
        ) {
          tokenType = "collateral";
        }
        // Check if it's the pegged token (ha)
        else if (
          peggedTokenAddress &&
          tokenLower === peggedTokenAddress.toLowerCase()
        ) {
          tokenType = "ha";
        }
        // Check if it's the leveraged token (hs)
        else if (
          leveragedTokenAddress &&
          tokenLower === leveragedTokenAddress.toLowerCase()
        ) {
          tokenType = "hs";
        }
        // Default to collateral if we can't identify
        else {
          tokenType = "collateral";
        }

        return {
          address: r.address,
          symbol: r.symbol,
          amount: r.claimable,
          type: tokenType,
        };
      });

      // Extract amounts by type
      collateralReceived = categorizedRewards
        .filter((r) => r.type === "collateral")
        .reduce((sum, r) => sum + r.amount, 0n);

      haReceived = categorizedRewards
        .filter((r) => r.type === "ha")
        .reduce((sum, r) => sum + r.amount, 0n);

      leveragedReceived = categorizedRewards
        .filter((r) => r.type === "hs")
        .reduce((sum, r) => sum + r.amount, 0n);

      // Build all steps upfront based on reward types
      // Create claim steps for EACH pool that has rewards
      steps = [];

      poolsWithRewards.forEach((pool) => {
        const poolName = pool.poolType === "collateral" ? "Collateral" : "Sail";
        const fullPoolName = `${marketSymbol} ${poolName} Pool`;

        // Get rewards specific to this pool for the details
        const poolRewardDetails = pool.rewards?.rewardTokens
          ?.filter((rt) => rt.claimable > 0n)
          .map((rt) => {
            const amount = Number(rt.claimable) / 1e18;
            let formatted: string;
            if (amount >= 1) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (amount >= 0.01) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else {
              formatted = amount
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 18,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            }
            return `${formatted} ${rt.symbol}`;
          })
          .join(",");

        steps.push({
          id: `claim-${pool.poolType}`,
          label: `Claim rewards from ${fullPoolName}`,
          status: "pending" as const,
          details: poolRewardDetails
            ? `Claiming ${poolRewardDetails}`
            : undefined,
        });
      });

      // Add redeem steps if we'll receive hs (leveraged) tokens
      // We'll attach fee info to the redeem step after calculating fees
      let redeemStepIndex: number | null = null;
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        steps.push(
          {
            id: "approve-leveraged",
            label: "Approve leveraged tokens for redemption",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Approve ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              }`;
            })(),
          },
          {
            id: "redeem",
            label: "Redeem leveraged tokens for collateral",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Redeem ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              } → ${collateralSymbol}`;
            })(),
          }
        );
        redeemStepIndex = steps.length - 1; // The redeem step is the last one we just added
      }

      // Add mint steps only if we have collateral to mint (from direct collateral rewards or from redeemed hs tokens)
      // Note: ha tokens don't need minting, they can be deposited directly
      const needsMinting = collateralReceived > 0n || leveragedReceived > 0n;

      // We'll attach fee info to the mint step after calculating fees
      let mintStepIndex: number | null = null;
      if (needsMinting) {
        steps.push(
          {
            id: "approve-collateral",
            label: `Approve ${collateralSymbol} for minting`,
            status: "pending",
            details:
              collateralReceived > 0n
                ? (() => {
                    const amount = Number(collateralReceived) / 1e18;
                    let formatted: string;
                    if (amount >= 1) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      });
                    } else if (amount >= 0.01) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      });
                    } else {
                      formatted = amount
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 18,
                          useGrouping: false,
                        })
                        .replace(/\.?0+$/, "");
                    }
                    return `Approve ${formatted} ${collateralSymbol}`;
                  })()
                : `Approve ${collateralSymbol} from redemption`,
          },
          {
            id: "mint",
            label: "Mint pegged tokens",
            status: "pending",
            details: "Mint ha tokens from collateral",
          }
        );
        mintStepIndex = steps.length - 1; // The mint step is the last one we just added
      }

      // Add deposit steps for each selected pool
      // If we have ha tokens directly, we can deposit them without minting
      const hasHaTokens = haReceived > 0n;
      const willHaveHaTokens = needsMinting || hasHaTokens;

      if (willHaveHaTokens) {
        // Add approve and deposit steps for each selected pool
        activeAllocations.forEach((allocation) => {
          const poolName =
            allocation.poolId === "collateral" ? "Collateral" : "Sail";

          steps.push({
            id: `approve-pegged-${allocation.poolId}`,
            label: `Approve pegged tokens for ${poolName} Pool`,
            status: "pending",
            details: `Approve ha tokens for ${poolName.toLowerCase()} pool deposit`,
          });

          steps.push({
            id: `deposit-${allocation.poolId}`,
            label: `Deposit to ${poolName} Pool`,
            status: "pending",
            details: `Deposit ${
              allocation.percentage
            }% to ${poolName.toLowerCase()} pool`,
          });
        });
      }

      // Fetch collateral price from price oracle for accurate USD calculations
      let collateralPriceUSD = 0;
      const priceOracleAddress = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (priceOracleAddress && publicClient) {
        try {
          const client = false ? publicClient : publicClient;
          const priceResult = await client?.readContract({
            address: priceOracleAddress,
            abi: wrappedPriceOracleABI,
            functionName: "latestAnswer",
          });

          if (
            priceResult &&
            Array.isArray(priceResult) &&
            priceResult.length >= 2
          ) {
            // Use maxUnderlyingPrice (index 1), prices are in 18 decimals
            const maxPrice = priceResult[1] as bigint;
            collateralPriceUSD = Number(maxPrice) / 1e18;
            console.log("[handleCompoundConfirm] Fetched collateral price:", {
              priceOracleAddress,
              maxPrice: maxPrice.toString(),
              collateralPriceUSD,
            });
          }
        } catch (priceError) {
          console.error(
            "[handleCompoundConfirm] Failed to fetch collateral price:",
            priceError
          );
        }
      }

      // Calculate all fees upfront
      const fees: FeeInfo[] = [];
      const feeErrors: string[] = [];

      totalCollateralForMinting = collateralReceived;

      // Calculate redeem fee if we'll receive leveraged tokens
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let redeemDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            redeemDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: fullMinterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [leveragedReceived],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (redeemDryRunResult) break;
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        // If still failed after retries, log but don't throw
        if (!redeemDryRunResult && lastError) {
          // Contract call failed - fees won't be shown upfront
          // User will see fees during actual transaction
        }

        if (
          redeemDryRunResult &&
          Array.isArray(redeemDryRunResult) &&
          redeemDryRunResult.length >= 4
        ) {
          const wrappedFee = redeemDryRunResult[1] as bigint;
          const wrappedCollateralReturned = redeemDryRunResult[3] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              leveragedReceived > 0n
                ? (Number(wrappedFee) / Number(leveragedReceived)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const redeemFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              label: "Redeem Leveraged Tokens",
            };
            fees.push(redeemFee);

            // Attach fee to the redeem step
            if (redeemStepIndex !== null && steps[redeemStepIndex]) {
              steps[redeemStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              };
            }

            // Update total collateral for minting
            if (
              wrappedCollateralReturned !== undefined &&
              typeof wrappedCollateralReturned === "bigint"
            ) {
              totalCollateralForMinting =
                collateralReceived + wrappedCollateralReturned;
            }
          }
        }
      }

      // Calculate mint fee
      if (totalCollateralForMinting > 0n) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let mintDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            mintDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: fullMinterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [totalCollateralForMinting],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (
              mintDryRunResult &&
              Array.isArray(mintDryRunResult) &&
              mintDryRunResult.length >= 2
            ) {
              break;
            }
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (
          mintDryRunResult &&
          Array.isArray(mintDryRunResult) &&
          mintDryRunResult.length >= 2
        ) {
          const wrappedFee = mintDryRunResult[1] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              totalCollateralForMinting > 0n
                ? (Number(wrappedFee) / Number(totalCollateralForMinting)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const mintFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol,
              label: "Mint Pegged Tokens",
            };
            fees.push(mintFee);

            // Attach fee to the mint step
            if (mintStepIndex !== null && steps[mintStepIndex]) {
              steps[mintStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol,
              };
            }
          }
        } else if (lastError) {
          // Track fee estimation error
          feeErrors.push(
            `Failed to estimate mint fee: ${
              lastError.message || "Unknown error"
            }`
          );
          console.error(
            "[handleCompoundConfirm] Mint fee estimation failed:",
            lastError
          );
        }
      }

      const handleCancel = () => {
        cancelRef.current = true;
        setIsCompounding(false);
        // Mark all pending steps as cancelled
        steps.forEach((step) => {
          if (step.status === "pending") {
            updateProgressStep(step.id, {
              status: "error",
              error: "Cancelled by user",
            });
          }
        });
      };

      // Store cancel handler in ref so TransactionProgressModal can access it
      cancelOperationRef.current = handleCancel;

      // Show confirmation modal first (always show it, even if no fees, to show steps)
      await new Promise<void>((resolve, reject) => {
        setCompoundConfirmation({
          steps,
          fees,
          feeErrors,
          onConfirm: () => {
            // Close confirmation modal first
            setCompoundConfirmation(null);
            // Resolve immediately - UI updates will happen in next tick
            resolve();
          },
        });
      });

      // Now show the progress modal after confirmation
      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps,
        currentStepIndex: 0,
      });

      // Small delay to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (setupError: any) {
      // Handle errors during setup phase
      const errorMessage =
        setupError?.message || "Failed to set up compound process";
      updateProgressStep("setup", {
        status: "error",
        error: errorMessage,
      });
      setIsCompounding(false);
      return; // Exit early - don't proceed with transactions
    }

    // Wait a moment after confirmation to ensure UI is ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      setIsCompounding(true);

      // Verify writeContractAsync is available
      if (typeof writeContractAsync !== "function") {
        throw new Error("writeContractAsync is not a function");
      }

      // Find the index of a step dynamically
      const findStepIndex = (stepId: string): number => {
        return steps.findIndex((s) => s.id === stepId);
      };

      // Step 1: Claim rewards from ALL pools that have rewards
      for (let i = 0; i < poolsWithRewards.length; i++) {
        const pool = poolsWithRewards[i];
        const stepId = `claim-${pool.poolType}`;

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Update progress to show we're starting this claim
        const stepIndex = findStepIndex(stepId);
        setCurrentStep(stepIndex);
        updateProgressStep(stepId, { status: "in_progress" });

        // Wait a moment to ensure UI updates
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Execute the claim transaction for this pool
        updateProgressStep(stepId, {
          status: "in_progress",
          details: "Sending transaction to wallet...",
        });

        const claimHash = await writeContractAsync({
          address: pool.poolAddress,
          abi: rewardsABI,
          functionName: "claim",
        });
        updateProgressStep(stepId, {
          status: "in_progress",
          txHash: claimHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: claimHash as `0x${string}`,
        });
        updateProgressStep(stepId, {
          status: "completed",
          txHash: claimHash as string,
          details: "Transaction confirmed",
        });

        // Small delay to ensure UI updates before moving to next step
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Step 2: If we received leveraged tokens, redeem them for collateral
      let currentStepIndex = poolsWithRewards.length;

      if (leveragedReceived > 0n && leveragedTokenAddress) {
        // Approve leveraged token for minter if needed
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("approve-leveraged");
        setCurrentStep(currentStepIndex);
        updateProgressStep("approve-leveraged", { status: "in_progress" });
        const leveragedAllowance = (await publicClient?.readContract({
          address: leveragedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        })) as bigint | undefined;

        if (!leveragedAllowance || leveragedAllowance < leveragedReceived) {
          const approveLeveragedHash = await writeContractAsync({
            address: leveragedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, leveragedReceived],
          });
          updateProgressStep("approve-leveraged", {
            status: "in_progress",
            txHash: approveLeveragedHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveLeveragedHash as `0x${string}`,
          });
          updateProgressStep("approve-leveraged", {
            status: "completed",
            txHash: approveLeveragedHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep("approve-leveraged", {
            status: "completed",
            details: "Already approved",
          });
        }

        // Redeem leveraged tokens for collateral
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("redeem");
        setCurrentStep(currentStepIndex);
        updateProgressStep("redeem", { status: "in_progress" });

        const collateralFromRedeem = (await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateRedeemLeveragedTokenOutput",
          args: [leveragedReceived],
        })) as bigint | undefined;

        if (!collateralFromRedeem)
          throw new Error("Failed to calculate redeem output");

        const minCollateralOut = (collateralFromRedeem * 99n) / 100n;
        const redeemHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [leveragedReceived, address, minCollateralOut],
        });
        updateProgressStep("redeem", {
          status: "in_progress",
          txHash: redeemHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: redeemHash as `0x${string}`,
        });
        updateProgressStep("redeem", {
          status: "completed",
          txHash: redeemHash as string,
          details: "Transaction confirmed",
        });
      }

      // Step 3: Mint ha tokens from total collateral
      if (totalCollateralForMinting === 0n) {
        throw new Error("No collateral available for minting");
      }

      // Calculate mint output (use dry run to get peggedMinted)
      const dryRunResult = (await publicClient?.readContract({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedTokenDryRun",
        args: [totalCollateralForMinting],
      })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

      const expectedOutput = dryRunResult?.[3];

      if (!expectedOutput) throw new Error("Failed to calculate mint output");

      // Approve collateral for minter if needed
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("approve-collateral");
      setCurrentStep(currentStepIndex);
      updateProgressStep("approve-collateral", { status: "in_progress" });
      const allowance = (await publicClient?.readContract({
        address: collateralAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, minterAddress],
      })) as bigint | undefined;

      if (cancelRef.current) throw new Error("Cancelled by user");
      if (!allowance || allowance < totalCollateralForMinting) {
        const approveHash = await writeContractAsync({
          address: collateralAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [minterAddress, totalCollateralForMinting],
        });
        updateProgressStep("approve-collateral", {
          status: "in_progress",
          txHash: approveHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
        updateProgressStep("approve-collateral", {
          status: "completed",
          txHash: approveHash as string,
          details: "Transaction confirmed",
        });
      } else {
        updateProgressStep("approve-collateral", {
          status: "completed",
          details: "Already approved",
        });
      }

      // Mint pegged tokens
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("mint");
      setCurrentStep(currentStepIndex);
      updateProgressStep("mint", { status: "in_progress" });
      const minPeggedOut = (expectedOutput * 99n) / 100n;
      const mintHash = await writeContractAsync({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedToken",
        args: [totalCollateralForMinting, address, minPeggedOut],
      });
      updateProgressStep("mint", {
        status: "in_progress",
        txHash: mintHash as string,
        details: "Waiting for transaction confirmation...",
      });
      await publicClient?.waitForTransactionReceipt({
        hash: mintHash as `0x${string}`,
      });
      updateProgressStep("mint", {
        status: "completed",
        txHash: mintHash as string,
        details: "Transaction confirmed",
      });

      // Step 4: Approve and deposit to each stability pool
      // Use only ha tokens from this flow: claimed ha rewards + newly minted ha
      const mintedHaFromThisFlow = expectedOutput || 0n;
      const depositAmount = haReceived + mintedHaFromThisFlow;
      if (depositAmount === 0n) {
        throw new Error("No ha tokens from rewards/mint to deposit");
      }

      // Deposit to all selected pools based on percentage allocations
      // Calculate deposit amounts based on percentages
      let remainingAmount = depositAmount;

      for (let i = 0; i < activeAllocations.length; i++) {
        const allocation = activeAllocations[i];
        const poolType = allocation.poolId;
        const targetPoolAddress =
          poolType === "collateral" ? collateralPoolAddress : sailPoolAddress;
        const poolName = poolType === "collateral" ? "Collateral" : "Sail";

        if (!targetPoolAddress) {
          throw new Error(`Pool address not found for ${poolType} pool`);
        }

        // Calculate deposit amount based on percentage
        // For the last pool, use remaining amount to account for rounding
        let poolDepositAmount: bigint;
        if (i === activeAllocations.length - 1) {
          poolDepositAmount = remainingAmount;
        } else {
          // Calculate: depositAmount * percentage / 100
          poolDepositAmount =
            (depositAmount * BigInt(allocation.percentage)) / 100n;
          remainingAmount -= poolDepositAmount;
        }

        // Step: Approve for this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const approveStepId = `approve-pegged-${poolType}`;
        currentStepIndex = findStepIndex(approveStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(approveStepId, { status: "in_progress" });

        // Check allowance for this pool
        const poolAllowance = (await publicClient?.readContract({
          address: peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, targetPoolAddress],
        })) as bigint | undefined;

        if (!poolAllowance || poolAllowance < poolDepositAmount) {
          const approveHash = await writeContractAsync({
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [targetPoolAddress, poolDepositAmount],
          });
          updateProgressStep(approveStepId, {
            status: "in_progress",
            txHash: approveHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveHash as `0x${string}`,
          });
          updateProgressStep(approveStepId, {
            status: "completed",
            txHash: approveHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep(approveStepId, {
            status: "completed",
            details: "Already approved",
          });
        }

        // Step: Deposit to this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const depositStepId = `deposit-${poolType}`;
        currentStepIndex = findStepIndex(depositStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(depositStepId, { status: "in_progress" });

        const minDepositAmount = (poolDepositAmount * 99n) / 100n;
        const depositHash = await writeContractAsync({
          address: targetPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "deposit",
          args: [poolDepositAmount, address, minDepositAmount],
        });
        updateProgressStep(depositStepId, {
          status: "in_progress",
          txHash: depositHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: depositHash as `0x${string}`,
        });
        updateProgressStep(depositStepId, {
          status: "completed",
          txHash: depositHash as string,
          details: "Transaction confirmed",
        });

        // Small delay between pools to ensure UI updates
        if (i < activeAllocations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (error: any) {
      const errorMessage = isUserRejection(error)
        ? "User declined the transaction"
        : error.message || "Transaction failed";

      // If user rejected or cancelled, mark all remaining steps as cancelled
      if (isUserRejection(error) || error.message === "Cancelled by user") {
        if (transactionProgress) {
          transactionProgress.steps.forEach((step, index) => {
            if (
              index > transactionProgress.currentStepIndex &&
              step.status === "pending"
            ) {
              updateProgressStep(step.id, {
                status: "error",
                error: "Cancelled - previous transaction declined",
              });
            }
          });
        }
      }

      // Mark current step as error
      if (transactionProgress) {
        const currentStep =
          transactionProgress.steps[transactionProgress.currentStepIndex];
        if (currentStep) {
          updateProgressStep(currentStep.id, {
            status: "error",
            error: errorMessage,
          });
        } else {
          // If no current step, mark the first pending step as error
          const firstPendingStep = transactionProgress.steps.find(
            (s) => s.status === "pending"
          );
          if (firstPendingStep) {
            updateProgressStep(firstPendingStep.id, {
              status: "error",
              error: errorMessage,
            });
          }
        }
      } else {
        // If transactionProgress is null, create it to show the error
        setTransactionProgress({
          isOpen: true,
          title: "Compounding Rewards",
          steps: steps.map((s, i) =>
            i === 0
              ? { ...s, status: "error" as const, error: errorMessage }
              : s
          ),
          currentStepIndex: 0,
        });
      }
      // Don't close modal on error - let user see what failed
    } finally {
      setIsCompounding(false);
      cancelOperationRef.current = null;
    }
  };

  // Claim all, compound all, and buy $TIDE handlers
  const handleClaimAll = async (
    selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = []
  ) => {
    if (!address || isClaimingAll) return;
    try {
      setIsClaimingAll(true);

      // If no pools selected, claim from all pools (backward compatibility)
      const poolsToClaim =
        selectedPools.length > 0
          ? selectedPools
          : anchorMarkets.flatMap(([id, m]) => {
              const pools: Array<{
                marketId: string;
                poolType: "collateral" | "sail";
              }> = [];
              if ((m as any).addresses?.stabilityPoolCollateral) {
                pools.push({ marketId: id, poolType: "collateral" });
              }
              if ((m as any).addresses?.stabilityPoolLeveraged) {
                pools.push({ marketId: id, poolType: "sail" });
              }
              return pools;
            });

      // Check if there are pools to claim
      if (poolsToClaim.length === 0) {
        setIsClaimingAll(false);
        return;
      }

      // Initialize progress modal with steps for each pool
      const steps: TransactionStep[] = poolsToClaim.map(
        ({ marketId, poolType }) => {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const marketSymbol = market?.peggedToken?.symbol || marketId;
          return {
            id: `${marketId}-${poolType}`,
            label: `Claim rewards from ${marketSymbol} ${poolType} pool`,
            status: "pending",
          };
        }
      );

      // Track if the process has been cancelled - use a ref so it persists across renders
      const cancelRef = { current: false };

      const handleCancel = () => {
        cancelRef.current = true;
        setIsClaimingAll(false);
        // Mark all pending steps as cancelled
        steps.forEach((step) => {
          if (step.status === "pending") {
            updateProgressStep(step.id, {
              status: "error",
              error: "Cancelled by user",
            });
          }
        });
      };

      setTransactionProgress({
        isOpen: true,
        title: "Claiming All Rewards",
        steps,
        currentStepIndex: 0,
      });

      let completedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < poolsToClaim.length; i++) {
        // Check if cancelled before processing each transaction
        if (cancelRef.current) {
          break;
        }
        const { marketId, poolType } = poolsToClaim[i];

        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) {
          const stepId = `${marketId}-${poolType}`;
          setCurrentStep(i);
          updateProgressStep(stepId, {
            status: "error",
            error: `Market ${marketId} not found`,
          });
          errorCount++;
          continue;
        }

        const stepId = `${marketId}-${poolType}`;
        setCurrentStep(i);
        updateProgressStep(stepId, { status: "in_progress" });

        try {
          const poolAddress =
            poolType === "collateral"
              ? ((market as any).addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : ((market as any).addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);

          if (!poolAddress) {
            updateProgressStep(stepId, {
              status: "error",
              error: "Pool address not found",
            });
            errorCount++;
            continue;
          }

          // Call claim() directly on the Stability Pool contract
          const hash = await writeContractAsync({
            address: poolAddress,
            abi: rewardsABI,
            functionName: "claim",
          });

          updateProgressStep(stepId, {
            status: "in_progress",
            txHash: hash as string,
            details: "Waiting for transaction confirmation...",
          });

          await publicClient?.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
          });

          updateProgressStep(stepId, {
            status: "completed",
            txHash: hash as string,
            details: "Transaction confirmed",
          });
          completedCount++;
        } catch (e: any) {
          const errorMessage = isUserRejection(e)
            ? "User declined the transaction"
            : e.message || "Transaction failed";
          updateProgressStep(stepId, {
            status: "error",
            error: errorMessage,
          });
          errorCount++;

          // If user rejected, stop processing remaining transactions
          if (isUserRejection(e)) {
            cancelRef.current = true;
            // Mark remaining pending steps as cancelled
            for (let j = i + 1; j < poolsToClaim.length; j++) {
              const remainingStepId = `${poolsToClaim[j].marketId}-${poolsToClaim[j].poolType}`;
              updateProgressStep(remainingStepId, {
                status: "error",
                error: "Cancelled - previous transaction declined",
              });
            }
            break;
          }
        }
      }

      // Clear cancel handler ref
      cancelOperationRef.current = null;

      // Only refetch and close if at least one transaction completed
      if (completedCount > 0) {
        // Wait for blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Refetch all contract data
        await Promise.all([refetchReads(), refetchUserDeposits()]);
      } else {
        // If no transactions completed, keep modal open to show errors
        // Don't close the modal - let user see what went wrong
      }
    } catch (error: any) {
      const errorMessage = isUserRejection(error)
        ? "User declined the transaction"
        : error.message || "Fatal error occurred";
      // Mark all pending steps as error if there's a fatal error
      if (transactionProgress) {
        transactionProgress.steps.forEach((step) => {
          if (step.status === "pending" || step.status === "in_progress") {
            updateProgressStep(step.id, {
              status: "error",
              error: errorMessage,
            });
          }
        });
      }
      // Don't close modal on fatal error - let user see what happened
    } finally {
      setIsClaimingAll(false);
    }
  };

  const handleCompoundAll = async (
    selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = []
  ) => {
    if (!address || isCompoundingAll) return;

    // First, find the market with rewards to compound
    // Use the first market with rewards (for now, we show one pool selection modal)
    let marketWithRewards: any = null;
    let totalRewardAmount = 0n;

    // If no pools selected, use all pools with rewards
    const poolsToCompound =
      selectedPools.length > 0
        ? selectedPools
        : anchorMarkets.flatMap(([id, m]) => {
            const pools: Array<{
              marketId: string;
              poolType: "collateral" | "sail";
            }> = [];
            if ((m as any).addresses?.stabilityPoolCollateral) {
              pools.push({ marketId: id, poolType: "collateral" });
            }
            if ((m as any).addresses?.stabilityPoolLeveraged) {
              pools.push({ marketId: id, poolType: "sail" });
            }
            return pools;
          });

    // Find first market with rewards
    for (const [id, m] of anchorMarkets) {
      const selectedPool = poolsToCompound.find((p) => p.marketId === id);
      if (!selectedPool) continue;

      // Check if this market has rewards
      const collateralPoolAddress = (m as any).addresses
        ?.stabilityPoolCollateral;
      const sailPoolAddress = (m as any).addresses?.stabilityPoolLeveraged;

      const poolReward = allPoolRewards?.find(
        (r) =>
          (collateralPoolAddress &&
            r.poolAddress.toLowerCase() ===
              collateralPoolAddress.toLowerCase()) ||
          (sailPoolAddress &&
            r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase())
      );

      if (
        poolReward &&
        poolReward.rewardTokens.some((rt) => rt.claimable > 0n)
      ) {
        marketWithRewards = m;
        totalRewardAmount = poolReward.rewardTokens.reduce(
          (sum, rt) => sum + rt.claimable,
          0n
        );
        break;
      }
    }

    if (!marketWithRewards) {
      // No rewards to compound
      return;
    }

    // Show pool selection modal for this market
    handleCompoundRewards(marketWithRewards, "collateral", totalRewardAmount);
  };

  const handleBuyTide = async (
    selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = []
  ) => {
    // TODO: Implement Buy $TIDE functionality
    // This would involve swapping rewards for $TIDE tokens
    // Buy $TIDE functionality to be implemented
    // For now, we'll just claim the rewards first
    // In the future, this should swap rewards for $TIDE
    await handleClaimAll(selectedPools);
  };

  // Individual market claim handlers
  const handleClaimMarketBasicClaim = async () => {
    if (!address || !selectedMarketForClaim || isClaiming) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsClaiming(true);
      if ((market as any).addresses?.stabilityPoolCollateral) {
        await handleClaimRewards(market, "collateral");
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        await handleClaimRewards(market, "sail");
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (e) {
      // Failed to claim market rewards
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimMarketCompound = async () => {
    if (!address || !selectedMarketForClaim || isCompounding) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsCompounding(true);
      // Collect rewards for this market
      const marketRewards: Array<{
        poolType: "collateral" | "sail";
        rewardAmount: bigint;
      }> = [];

      if ((market as any).addresses?.stabilityPoolCollateral) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolCollateral,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "collateral", rewardAmount: rewards });
        }
      }

      if ((market as any).addresses?.stabilityPoolLeveraged) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolLeveraged,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "sail", rewardAmount: rewards });
        }
      }

      if (marketRewards.length === 0) return;

      // Claim and compound rewards (similar to handleCompoundAll but for single market)
      // This is a simplified version - you may want to reuse the compound logic
      for (const { poolType, rewardAmount } of marketRewards) {
        if (poolType === "collateral") {
          await handleClaimRewards(market, "collateral");
          // Then mint and deposit (simplified - you may want to add a compound modal)
        } else {
          await handleClaimRewards(market, "sail");
          // Then redeem sail, mint pegged, and deposit (simplified)
        }
      }
    } catch (e) {
      // Failed to compound market rewards
    } finally {
      setIsCompounding(false);
    }
  };

  const handleClaimMarketBuyTide = async () => {
    // TODO: Implement Buy $TIDE functionality for individual market
    await handleClaimMarketBasicClaim();
  };

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <>
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            {/* Title - Full Row */}
            <div className="p-4 flex items-center justify-center mb-0">
              <h1 className="font-bold font-mono text-white text-7xl text-center">
                Anchor
              </h1>
            </div>

            {/* Subheader */}
            <div className="flex items-center justify-center mb-2 -mt-6">
              <p className="text-white/80 text-lg text-center">
                Pegged tokens with real yield
              </p>
            </div>

            {/* Four Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Mint Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <BanknotesIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Mint
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Mint a pegged token with a supported asset
                </p>
              </div>

              {/* Secure Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ShieldCheckIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Secure
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Deposit into a stability pool to secure the protocol
                </p>
              </div>

              {/* Earn Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Earn
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Earn real yield from collateral and trading fees for helping
                  secure the protocol
                </p>
              </div>

              {/* Redeem Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ArrowPathIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Redeem
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Redeem for collateral and redeem tokens at any time
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Rewards Bar - Under Title Boxes */}
          {(() => {
            // Calculate total rewards for the bar
            let totalRewardsForBar = 0;
            let totalPositionForBar = 0;
            // For blended APR calculation
            let totalWeightedAPR = 0; // Sum of (depositUSD * APR)
            let totalDepositUSD = 0; // Sum of depositUSD
            // Track individual positions for tooltip
            const positionAPRs: Array<{
              poolType: "collateral" | "sail";
              marketId: string;
              depositUSD: number;
              apr: number;
            }> = [];

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

            return (
              <div className="mb-2">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* Rewards Header Box */}
                  <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2 md:col-span-1 lg:col-span-1">
                    <h2 className="font-bold font-mono text-white text-2xl text-center">
                      Rewards
                    </h2>
                    <InfoTooltip
                      label={
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg mb-2">
                              Anchor Ledger Marks
                            </h3>
                            <p className="text-white/90 leading-relaxed">
                              Anchor Ledger Marks are earned by holding ha
                              tokens (pegged tokens) and depositing into
                              stability pools.
                            </p>
                          </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/90 leading-relaxed mb-2">
                              Each mark represents your contribution to
                              stabilizing Harbor markets through token holdings
                              and pool deposits.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                The more you contribute, the deeper your mark on
                                the ledger.
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                When $TIDE surfaces, these marks will convert
                                into your share of rewards and governance power.
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/80 italic leading-relaxed">
                              Think of them as a record of your journey — every
                              mark, a line in Harbor's logbook.
                            </p>
                          </div>
                        </div>
                      }
                      side="right"
                    >
                      <QuestionMarkCircleIcon className="w-5 h-5 text-white cursor-help" />
                    </InfoTooltip>
                  </div>

                  {/* Combined Content Box */}
                  <div className="bg-[#17395F] p-3 md:col-span-1 lg:col-span-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 pl-2">
                      {/* Claimable Value */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-xs text-white/70 mb-1.5 text-center font-medium">
                          Claimable Value
                        </div>
                        <div className="text-lg font-bold text-white font-mono text-center">
                          $
                          {totalRewardsForBar > 0
                            ? totalRewardsForBar.toFixed(2)
                            : "0.00"}
                        </div>
                      </div>

                      {/* vAPR */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-xs text-white/70 mb-1.5 text-center font-medium flex items-center justify-center gap-1">
                          vAPR
                          <SimpleTooltip
                            label={
                              <div className="text-left">
                                <div className="font-semibold mb-1">
                                  Blended APR from Your Positions
                                </div>
                                {positionAPRs.length > 0 ? (
                                  <div className="text-xs space-y-1">
                                    {positionAPRs.map((pos, idx) => (
                                      <div key={idx}>
                                        •{""}
                                        {pos.poolType === "collateral"
                                          ? "Collateral"
                                          : "Sail"}
                                        {""}
                                        Pool ({pos.marketId}):{""}
                                        {pos.apr.toFixed(2)}% (
                                        {formatCompactUSD(pos.depositUSD)})
                                      </div>
                                    ))}
                                    <div className="mt-2 pt-2 border-t border-white/20 font-semibold">
                                      Weighted Average:{""}
                                      {blendedAPRForBar > 0
                                        ? `${blendedAPRForBar.toFixed(2)}%`
                                        : "-"}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs">
                                    No stability pool positions found
                                  </div>
                                )}
                                {projectedAPR.harvestableAmount !== null &&
                                  projectedAPR.harvestableAmount > 0n && (
                                    <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
                                      Projected APR (next 7 days):{""}
                                      {projectedAPR.collateralPoolAPR !==
                                        null &&
                                        `${projectedAPR.collateralPoolAPR.toFixed(
                                          2
                                        )}% (Collateral)`}
                                      {projectedAPR.collateralPoolAPR !==
                                        null &&
                                        projectedAPR.leveragedPoolAPR !==
                                          null &&
                                        " /"}
                                      {projectedAPR.leveragedPoolAPR !== null &&
                                        `${projectedAPR.leveragedPoolAPR.toFixed(
                                          2
                                        )}% (Sail)`}
                                      <br />
                                      Based on{""}
                                      {(
                                        Number(projectedAPR.harvestableAmount) /
                                        1e18
                                      ).toFixed(4)}
                                      {""}
                                      wstETH harvestable.
                                      {projectedAPR.remainingDays !== null &&
                                        ` ~${projectedAPR.remainingDays.toFixed(
                                          1
                                        )} days until harvest.`}
                                    </div>
                                  )}
                              </div>
                            }
                          >
                            <span className="text-white/50 cursor-help text-xs">
                              [?]
                            </span>
                          </SimpleTooltip>
                        </div>
                        <div className="text-lg font-bold text-white font-mono text-center">
                          {blendedAPRForBar > 0
                            ? `${blendedAPRForBar.toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-xs text-white/70 mb-1.5 text-center font-medium">
                          Action
                        </div>
                        <button
                          onClick={() => {
                            setIsClaimAllModalOpen(true);
                          }}
                          disabled={isClaimingAll || isCompoundingAll}
                          className="px-4 py-1.5 text-xs font-medium bg-white text-[#1E4775] border border-white hover:bg-white/90 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Anchor Ledger Marks Box */}
                  <div className="bg-[#17395F] p-3 md:col-span-1 lg:col-span-1">
                    <div className="text-xs text-white/70 mb-0.5 text-center">
                      Anchor Ledger Marks
                    </div>
                    <div className="text-base font-bold text-white font-mono text-center tabular-nums">
                      {!mounted || isLoadingAnchorMarks ? (
                        <span className="text-white/50">-</span>
                      ) : totalAnchorMarks > 0 ? (
                        totalAnchorMarks.toLocaleString(undefined, {
                          minimumFractionDigits: totalAnchorMarks < 100 ? 2 : 0,
                          maximumFractionDigits: totalAnchorMarks < 100 ? 2 : 0,
                        })
                      ) : (
                        "0"
                      )}
                    </div>
                    <div className="text-[10px] text-white/50 text-center mt-0.5">
                      {!mounted || isLoadingAnchorMarks
                        ? ""
                        : totalAnchorMarksPerDay > 0
                        ? `${totalAnchorMarksPerDay.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} marks/day`
                        : "0 marks/day"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Earnings Section */}
          {(() => {
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
                                      {formatToken(collateralRewards)}
                                      {""}
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
                                className="px-3 py-1 text-xs font-medium bg-white text-[#1E4775] border border-white hover:bg-white/90 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
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
          })()}

          {/* Markets List */}
          <section className="space-y-2 overflow-visible">
            {/* Header Row */}
            <div className="bg-white py-1.5 px-2 overflow-x-auto">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                <div className="min-w-0 text-center">Token</div>
                <div className="text-center min-w-0">Deposit Assets</div>
                <div className="text-center min-w-0">APR</div>
                <div className="text-center min-w-0">Earnings</div>
                <div className="text-center min-w-0">Reward Assets</div>
                <div className="text-center min-w-0">Position</div>
                <div className="text-center min-w-0">Actions</div>
              </div>
            </div>

            {/* Market Cards/Rows */}
            {(() => {
              // Show grouped markets by ha token
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
                groups[symbol].push({
                  marketId: id,
                  market: m,
                  marketIndex: mi,
                });
              });

              // Process each group
              return Object.entries(groups).map(([symbol, marketList]) => {
                // Collect all data for markets in this group
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
                        (d.poolType === "collateral" ||
                          d.poolType === "Collateral")
                    );
                    const subgraphSailDeposit = poolDeposits?.find(
                      (d) =>
                        sailPoolAddress &&
                        d.poolAddress.toLowerCase() === sailPoolAddress &&
                        (d.poolType === "sail" ||
                          d.poolType === "Sail" ||
                          d.poolType === "leveraged")
                    );

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
                      const prevHasStabilityPoolManager = !!(prevMarket as any)
                        .addresses?.stabilityPoolManager;
                      const prevPeggedTokenAddress = (prevMarket as any)
                        ?.addresses?.peggedToken;
                      offset += 5; // 4 minter calls + 1 config call
                      if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
                      if (prevHasCollateral) {
                        offset += 4; // 4 pool reads
                        if (prevPeggedTokenAddress) offset += 1; // rewardData (if pegged token exists)
                      }
                      if (prevHasSail) {
                        offset += 4; // 4 pool reads
                        if (prevPeggedTokenAddress) offset += 1; // rewardData (if pegged token exists)
                      }
                      if (prevHasPriceOracle) offset += 1;
                    }

                    const baseOffset = offset;

                    // Get collateralRatio - check both result and status
                    const collateralRatioRead = reads?.[baseOffset];

                    const collateralValueRead = reads?.[baseOffset + 1];
                    const totalDebtRead = reads?.[baseOffset + 2];
                    const collateralValue = collateralValueRead?.result as
                      | bigint
                      | undefined;
                    const totalDebt = totalDebtRead?.result as
                      | bigint
                      | undefined;

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
                      collateralRatio =
                        (collateralValue * 10n ** 18n) / totalDebt;
                    }
                    const positionData = marketPositions[marketId];
                    const peggedTokenPriceRead = reads?.[baseOffset + 3];
                    const peggedTokenPrice =
                      peggedTokenPriceRead?.status === "success"
                        ? (peggedTokenPriceRead.result as bigint | undefined)
                        : positionData?.peggedTokenPrice;
                    const minterConfig = reads?.[baseOffset + 4]?.result as
                      | any
                      | undefined;

                    // Get rebalanceThreshold from StabilityPoolManager (index 5)
                    // This is the collateral ratio below which rebalancing can occur
                    const rebalanceThresholdResult = reads?.[baseOffset + 5];
                    let minCollateralRatio: bigint | undefined;

                    if (
                      rebalanceThresholdResult?.status === "success" &&
                      rebalanceThresholdResult.result
                    ) {
                      minCollateralRatio =
                        rebalanceThresholdResult.result as bigint;
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
                        minCollateralRatio = allFirstBounds.reduce(
                          (min, current) => (current < min ? current : min)
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
                    let sailPoolAPR:
                      | { collateral: number; steam: number }
                      | undefined;
                    let sailPoolRewards: bigint | undefined;
                    let sailPoolDeposit: bigint | undefined;

                    // Account for rebalanceThreshold if current market has stabilityPoolManager
                    const hasStabilityPoolManager = !!(market as any).addresses
                      ?.stabilityPoolManager;
                    const currentPeggedTokenAddress = (market as any).addresses
                      ?.peggedToken;
                    let currentOffset = baseOffset + 5; // 4 minter calls + 1 config
                    if (hasStabilityPoolManager) currentOffset += 1; // rebalanceThreshold

                    if (hasCollateralPool) {
                      // Debug: Check what's at this offset
                      const tvlRead = reads?.[currentOffset];
                      // console.log("[TVL Debug] Collateral pool TVL read:", {
                      // marketId,
                      // baseOffset,
                      // currentOffset,
                      // hasStabilityPoolManager,
                      // rawRead: tvlRead,
                      // status: tvlRead?.status,
                      // result: tvlRead?.result,
                      // error: tvlRead?.error,
                      // });
                      collateralPoolTVL = tvlRead?.result as bigint | undefined;
                      const collateralAPRResult = reads?.[currentOffset + 1]
                        ?.result as [bigint, bigint] | undefined;
                      collateralPoolAPR = collateralAPRResult
                        ? {
                            collateral:
                              (Number(collateralAPRResult[0]) / 1e16) * 100,
                            steam:
                              (Number(collateralAPRResult[1]) / 1e16) * 100,
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
                        collateralPoolDeposit =
                          collateralDepositRead.result as bigint;
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

                          const rewardTokenPrice =
                            Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                          const depositTokenPrice =
                            Number(peggedTokenPrice) / 1e18; // same for collateral pool
                          const annualRewardsValueUSD =
                            (annualRewards * rewardTokenPrice) / 1e18;
                          const depositValueUSD =
                            (Number(collateralPoolTVL) * depositTokenPrice) /
                            1e18;

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
                        ? ((market as any).addresses
                            ?.stabilityPoolCollateral as
                            | `0x${string}`
                            | undefined)
                        : undefined;
                      if (collateralPoolAddress) {
                        const poolReward = poolRewardsMap.get(
                          collateralPoolAddress
                        );
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
                      // Debug: Check what's at this offset
                      const sailTvlRead = reads?.[currentOffset];
                      // console.log("[TVL Debug] Sail pool TVL read:", {
                      // marketId,
                      // currentOffset,
                      // rawRead: sailTvlRead,
                      // status: sailTvlRead?.status,
                      // result: sailTvlRead?.result,
                      // error: sailTvlRead?.error,
                      // });
                      sailPoolTVL = sailTvlRead?.result as bigint | undefined;
                      const sailAPRResult = reads?.[currentOffset + 1]
                        ?.result as [bigint, bigint] | undefined;
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

                          const rewardTokenPrice =
                            Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                          const depositTokenPrice =
                            Number(peggedTokenPrice) / 1e18; // same for sail pool
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
                                    (sailPoolAPR.collateral || 0) +
                                    calculatedAPR,
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
                          ? (sailPoolAPR.collateral || 0) +
                            (sailPoolAPR.steam || 0)
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

                    const hasPriceOracle = !!(market as any).addresses
                      ?.collateralPrice;
                    const collateralPriceDecimals = 18;
                    let collateralPrice: bigint | undefined;
                    let wrappedRate: bigint | undefined;
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
                      currentOffset += 1; // Move past collateral oracle (latestAnswer only)
                    }

                    // peggedTokenPrice is already read from minter contract at baseOffset + 3
                    // It returns price in terms of underlying collateral (18 decimals)
                    // where 1e18 = $1.00 normally

                    // Get position data from unified hook (overrides reads data for consistency)
                    const userDeposit = positionData?.walletHa || 0n;
                    // Override pool deposits from hook for consistent display
                    const finalCollateralPoolDeposit =
                      positionData?.collateralPool ||
                      collateralPoolDeposit ||
                      0n;
                    const finalSailPoolDeposit =
                      positionData?.sailPool || sailPoolDeposit || 0n;

                    // Use position data from hook for USD values
                    const collateralPoolDepositUSD =
                      positionData?.collateralPoolUSD || 0;
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
                      const poolReward = poolRewardsMap.get(
                        sailPoolAddressForRewards
                      );
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
                      marketId === "pb-steth" &&
                      projectedAPR.collateralPoolAPR !== null
                        ? projectedAPR.collateralPoolAPR
                        : null;
                    const projectedSailAPR =
                      marketId === "pb-steth" &&
                      projectedAPR.leveragedPoolAPR !== null
                        ? projectedAPR.leveragedPoolAPR
                        : null;

                    // Calculate APR ranges (min and max across pools)
                    const aprValues = [collateralTotalAPR, sailTotalAPR].filter(
                      (v) => v > 0
                    );
                    const minAPR =
                      aprValues.length > 0 ? Math.min(...aprValues) : 0;
                    const maxAPR =
                      aprValues.length > 0 ? Math.max(...aprValues) : 0;

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
                const activeMarketsData = marketsData.filter(
                  (m) => m.collateralValue !== undefined && m.collateralValue > 0n
                );

                // Skip this group if no markets have completed genesis
                if (activeMarketsData.length === 0) {
                  return null;
                }

                // Calculate combined values
                const combinedPositionUSD = activeMarketsData.reduce(
                  (sum, m) =>
                    sum +
                    m.collateralPoolDepositUSD +
                    m.sailPoolDepositUSD +
                    m.haTokenBalanceUSD,
                  0
                );
                // Also track total token amounts (for display when USD isn't available)
                const combinedPositionTokens = activeMarketsData.reduce(
                  (sum, m) =>
                    sum +
                    Number(m.collateralPoolDeposit || 0n) / 1e18 +
                    Number(m.sailPoolDeposit || 0n) / 1e18 +
                    Number(m.userDeposit || 0n) / 1e18,
                  0
                );
                const combinedRewardsUSD = activeMarketsData.reduce(
                  (sum, m) => sum + m.collateralRewardsUSD + m.sailRewardsUSD,
                  0
                );

                // Calculate APR ranges across all markets in group
                const allMinAPRs = activeMarketsData
                  .map((m) => m.minAPR)
                  .filter((v) => v > 0);
                const allMaxAPRs = activeMarketsData
                  .map((m) => m.maxAPR)
                  .filter((v) => v > 0);
                const minAPR =
                  allMinAPRs.length > 0 ? Math.min(...allMinAPRs) : 0;
                const maxAPR =
                  allMaxAPRs.length > 0 ? Math.max(...allMaxAPRs) : 0;

                // Collect actual APRs from stability pools for tooltip
                const collateralPoolAPRs = activeMarketsData
                  .map((m) => m.collateralPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const sailPoolAPRs = activeMarketsData
                  .map((m) => m.sailPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const collateralPoolAPRMin =
                  collateralPoolAPRs.length > 0
                    ? Math.min(...collateralPoolAPRs)
                    : null;
                const collateralPoolAPRMax =
                  collateralPoolAPRs.length > 0
                    ? Math.max(...collateralPoolAPRs)
                    : null;
                const sailPoolAPRMin =
                  sailPoolAPRs.length > 0 ? Math.min(...sailPoolAPRs) : null;
                const sailPoolAPRMax =
                  sailPoolAPRs.length > 0 ? Math.max(...sailPoolAPRs) : null;

                // Calculate projected APR ranges
                const allMinProjectedAPRs = activeMarketsData
                  .map((m) => m.minProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const allMaxProjectedAPRs = activeMarketsData
                  .map((m) => m.maxProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const minProjectedAPR =
                  allMinProjectedAPRs.length > 0
                    ? Math.min(...allMinProjectedAPRs)
                    : null;
                const maxProjectedAPR =
                  allMaxProjectedAPRs.length > 0
                    ? Math.max(...allMaxProjectedAPRs)
                    : null;

                // Collect all unique deposit assets
                const assetMap = new Map<
                  string,
                  { symbol: string; name: string }
                >();
                marketList.forEach(({ market }) => {
                  const peggedTokenSymbol = market?.peggedToken?.symbol;
                  const assets = getAcceptedDepositAssets(
                    market,
                    peggedTokenSymbol
                  );
                  assets.forEach((asset) => {
                    if (!assetMap.has(asset.symbol)) {
                      assetMap.set(asset.symbol, asset);
                    }
                  });
                });
                const allDepositAssets = Array.from(assetMap.values());

                // Collect all unique reward tokens from pools for markets in this group
                const firstMarket = marketList[0]?.market;
                const collateralPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;
                const peggedTokenSymbol = firstMarket?.peggedToken?.symbol;
                const collateralSymbol = firstMarket?.collateral?.symbol || "";

                const isExpanded = expandedMarket === symbol;

                return (
                  <React.Fragment key={symbol}>
                    <div
                      className={`p-3 overflow-x-auto transition cursor-pointer ${
                        isExpanded
                          ? "bg-[rgb(var(--surface-selected-rgb))]"
                          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                      }`}
                      onClick={() =>
                        setExpandedMarket(isExpanded ? null : symbol)
                      }
                    >
                      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                        <div className="whitespace-nowrap min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <SimpleTooltip label={peggedTokenSymbol || symbol}>
                              <Image
                                src={getLogoPath(peggedTokenSymbol || symbol)}
                                alt={peggedTokenSymbol || symbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help"
                              />
                            </SimpleTooltip>
                            <span className="text-[#1E4775] font-medium text-sm lg:text-base">
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
                          className="flex items-center justify-center gap-1.5 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allDepositAssets.map((asset) => {
                            // Check if this asset is a ha token (pegged token)
                            const isHaToken =
                              peggedTokenSymbol &&
                              asset.symbol === peggedTokenSymbol;

                            return (
                              <SimpleTooltip
                                key={asset.symbol}
                                label={
                                  <div>
                                    <div className="font-semibold mb-1">
                                      {asset.name}
                                    </div>
                                    <div className="text-xs opacity-90">
                                      {isHaToken ? (
                                        <>
                                          {asset.name} tokens are deposited
                                          directly into the chosen stability
                                          pool. The collateral backing these
                                          tokens is already in the market.
                                        </>
                                      ) : (
                                        <>
                                          Collateral is owned by the market and
                                          your position is swapped for{""}
                                          {peggedTokenSymbol || "haTOKENS"}.
                                        </>
                                      )}
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
                                {projectedAPR.hasRewardsNoTVL ? (
                                  <div className="text-xs space-y-2">
                                    <div className="bg-green-500/20 border border-green-500/30 px-2 py-1">
                                      <span className="font-semibold text-green-400">
                                        Rewards waiting!
                                      </span>
                                      <div className="mt-1 text-green-300">
                                        No deposits yet - first depositors will
                                        receive maximum APR
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {projectedAPR.collateralRewards7Day !==
                                        null &&
                                        projectedAPR.collateralRewards7Day >
                                          0n && (
                                          <div>
                                            • Collateral Pool:{""}
                                            {(
                                              Number(
                                                projectedAPR.collateralRewards7Day
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {""}
                                            wstETH streaming over 7 days
                                          </div>
                                        )}
                                      {projectedAPR.leveragedRewards7Day !==
                                        null &&
                                        projectedAPR.leveragedRewards7Day >
                                          0n && (
                                          <div>
                                            • Sail Pool:{""}
                                            {(
                                              Number(
                                                projectedAPR.leveragedRewards7Day
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {""}
                                            wstETH streaming over 7 days
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs space-y-1">
                                    <div>
                                      • Collateral Pool:{""}
                                      {collateralPoolAPRMin !== null &&
                                      collateralPoolAPRMax !== null
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
                                    <div>
                                      • Sail Pool:{""}
                                      {sailPoolAPRMin !== null &&
                                      sailPoolAPRMax !== null
                                        ? sailPoolAPRMin === sailPoolAPRMax
                                          ? `${sailPoolAPRMin.toFixed(2)}%`
                                          : `${sailPoolAPRMin.toFixed(
                                              2
                                            )}% - ${sailPoolAPRMax.toFixed(2)}%`
                                        : "-"}
                                    </div>
                                  </div>
                                )}
                                {!projectedAPR.hasRewardsNoTVL &&
                                  (projectedAPR.collateralPoolAPR !== null ||
                                    projectedAPR.leveragedPoolAPR !== null) && (
                                    <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
                                      <div className="font-semibold mb-1">
                                        Projected APR (next 7 days)
                                      </div>
                                      <div className="space-y-1">
                                        <div>
                                          • Collateral Pool:{""}
                                          {projectedAPR.collateralPoolAPR !==
                                          null
                                            ? `${projectedAPR.collateralPoolAPR.toFixed(
                                                2
                                              )}%`
                                            : "-"}
                                        </div>
                                        <div>
                                          • Sail Pool:{""}
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
                                        projectedAPR.harvestableAmount > 0n && (
                                          <div className="mt-1 text-xs opacity-80">
                                            Based on{""}
                                            {(
                                              Number(
                                                projectedAPR.harvestableAmount
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {""}
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
                                // Special case: rewards waiting with no TVL
                                if (projectedAPR.hasRewardsNoTVL) {
                                  return "10k%+";
                                }

                                // Format APR display:"X% - Y% (Proj: A% - B%)"
                                const hasCurrentAPR = minAPR > 0 || maxAPR > 0;
                                const hasProjectedAPR =
                                  minProjectedAPR !== null ||
                                  maxProjectedAPR !== null;

                                if (!hasCurrentAPR && !hasProjectedAPR)
                                  return "-";

                                let display = "";

                                // Show projected APR range (this is the main display now)
                                if (hasProjectedAPR) {
                                  if (
                                    minProjectedAPR !== null &&
                                    maxProjectedAPR !== null &&
                                    minProjectedAPR !== maxProjectedAPR
                                  ) {
                                    // Cap display at 10k%
                                    const minDisplay =
                                      minProjectedAPR >= 10000
                                        ? "10k"
                                        : minProjectedAPR.toFixed(1);
                                    const maxDisplay =
                                      maxProjectedAPR >= 10000
                                        ? "10k+"
                                        : maxProjectedAPR.toFixed(1);
                                    display = `${minDisplay}% - ${maxDisplay}%`;
                                  } else if (maxProjectedAPR !== null) {
                                    display =
                                      maxProjectedAPR >= 10000
                                        ? "10k%+"
                                        : `${maxProjectedAPR.toFixed(1)}%`;
                                  }
                                } else if (hasCurrentAPR) {
                                  // Fallback to current APR if no projected
                                  if (minAPR !== maxAPR && minAPR > 0) {
                                    display = `${minAPR.toFixed(
                                      1
                                    )}% - ${maxAPR.toFixed(1)}%`;
                                  } else {
                                    display = `${maxAPR.toFixed(1)}%`;
                                  }
                                }

                                return display || "-";
                              })()}
                            </span>
                          </SimpleTooltip>
                        </div>
                        <div
                          className="text-center min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[#1E4775] font-bold text-sm font-mono">
                            {combinedRewardsUSD > 0
                              ? `$${combinedRewardsUSD.toFixed(2)}`
                              : "-"}
                          </div>
                        </div>
                        <RewardTokensDisplay
                          collateralPool={collateralPoolAddress}
                          sailPool={sailPoolAddress}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManageModal({
                                marketId: marketList[0].marketId,
                                market: marketList[0].market,
                                initialTab: "deposit",
                                simpleMode: true,
                                bestPoolType: "collateral",
                                allMarkets: marketList.map((m) => ({
                                  marketId: m.marketId,
                                  market: m.market,
                                })),
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded View - Show all markets in group */}
                    {isExpanded && (
                      <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
                        {/* Consolidated Your Positions - shown once for the group */}
                        {(() => {
                          // Aggregate positions across all markets in this group
                          // ha token balance is the same for all markets (same token)
                          const firstMarket = activeMarketsData[0];
                          const haTokenBalance = firstMarket?.userDeposit;
                          const haTokenBalanceUSD = firstMarket?.haTokenBalanceUSD || 0;
                          const haSymbol = firstMarket?.market?.peggedToken?.symbol || "ha";
                          
                          // Aggregate pool deposits across all markets
                          let totalCollateralPoolDeposit = 0n;
                          let totalCollateralPoolDepositUSD = 0;
                          let totalSailPoolDeposit = 0n;
                          let totalSailPoolDepositUSD = 0;
                          
                          // Collect all withdrawal requests for this group
                          const groupWithdrawalRequests: typeof withdrawalRequests = [];
                          
                          activeMarketsData.forEach((md) => {
                            if (md.collateralPoolDeposit && md.collateralPoolDeposit > 0n) {
                              totalCollateralPoolDeposit += md.collateralPoolDeposit;
                              totalCollateralPoolDepositUSD += md.collateralPoolDepositUSD || 0;
                            }
                            if (md.sailPoolDeposit && md.sailPoolDeposit > 0n) {
                              totalSailPoolDeposit += md.sailPoolDeposit;
                              totalSailPoolDepositUSD += md.sailPoolDepositUSD || 0;
                            }
                            // Collect withdrawal requests for this market
                            const marketRequests = withdrawalRequests.filter(
                              (req) =>
                                req.poolAddress.toLowerCase() ===
                                  md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
                                req.poolAddress.toLowerCase() ===
                                  md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
                            );
                            groupWithdrawalRequests.push(...marketRequests);
                          });
                          
                          const hasGroupPositions =
                            haTokenBalanceUSD > 0 ||
                            totalCollateralPoolDepositUSD > 0 ||
                            totalSailPoolDepositUSD > 0 ||
                            (haTokenBalance && haTokenBalance > 0n) ||
                            totalCollateralPoolDeposit > 0n ||
                            totalSailPoolDeposit > 0n;
                          
                          if (!hasGroupPositions && groupWithdrawalRequests.length === 0) {
                            return null;
                          }
                          
                          return (
                            <div className="mb-4">
                              {/* Withdrawal requests for the group */}
                              {groupWithdrawalRequests.length > 0 && (
                                <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2 mb-3">
                                  <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
                                    Withdrawal Requests
                                  </div>
                                  <div className="space-y-1.5">
                                    {groupWithdrawalRequests.map((request) => {
                                      // Find the market this request belongs to
                                      const requestMarket = activeMarketsData.find(
                                        (md) =>
                                          request.poolAddress.toLowerCase() ===
                                            md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
                                          request.poolAddress.toLowerCase() ===
                                            md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
                                      );
                                      const isCollateralPool =
                                        request.poolAddress.toLowerCase() ===
                                        requestMarket?.market.addresses?.stabilityPoolCollateral?.toLowerCase();
                                      const poolType = isCollateralPool ? "collateral" : "sail";
                                      const startSec = Number(request.start);
                                      const endSec = Number(request.end);
                                      const isWindowOpen = request.status === "window";
                                      const countdownTarget =
                                        request.status === "waiting" ? startSec : endSec;
                                      const countdownLabel =
                                        request.status === "waiting"
                                          ? "Window opens in"
                                          : request.status === "window"
                                          ? "Window closes in"
                                          : "Window expired";
                                      const countdownText =
                                        countdownTarget > 0
                                          ? formatTimeRemaining(
                                              new Date(countdownTarget * 1000).toISOString(),
                                              request.currentTime
                                                ? new Date(Number(request.currentTime) * 1000)
                                                : new Date()
                                            )
                                          : "Ended";

                                      return (
                                        <div
                                          key={`${request.poolAddress}-${request.start.toString()}`}
                                          className="p-2 bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 text-xs flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                            <span className="text-[#1E4775] font-semibold">
                                              {poolType === "collateral" ? "Collateral" : "Sail"} Pool
                                              {requestMarket && activeMarketsData.length > 1 && (
                                                <span className="text-[#1E4775]/50 ml-1">
                                                  ({requestMarket.market.collateral?.symbol || "?"})
                                                </span>
                                              )}
                                            </span>
                                            <span
                                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                request.status === "window"
                                                  ? "bg-green-200 text-green-800 border-green-500"
                                                  : request.status === "waiting"
                                                  ? "bg-amber-200 text-amber-800 border-amber-500"
                                                  : "bg-gray-200 text-gray-700 border-gray-400"
                                              }`}
                                            >
                                              {request.status === "window"
                                                ? "Open"
                                                : request.status === "waiting"
                                                ? "Waiting"
                                                : "Expired"}
                                            </span>
                                            <span className="text-[11px] text-[#1E4775]/70">
                                              {countdownLabel}: {countdownText}
                                            </span>
                                          </div>
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={async () => {
                                                if (isWindowOpen) {
                                                  setWithdrawAmountInput("");
                                                  setWithdrawAmountError(null);
                                                  const maxAmount =
                                                    poolType === "collateral"
                                                      ? requestMarket?.collateralPoolDeposit
                                                      : requestMarket?.sailPoolDeposit;
                                                  setWithdrawAmountModal({
                                                    poolAddress: request.poolAddress,
                                                    poolType,
                                                    useEarly: false,
                                                    symbol: haSymbol,
                                                    maxAmount: maxAmount || 0n,
                                                  });
                                                } else {
                                                  setEarlyWithdrawModal({
                                                    poolAddress: request.poolAddress,
                                                    poolType,
                                                    start: request.start,
                                                    end: request.end,
                                                    earlyWithdrawFee: request.earlyWithdrawFee,
                                                    symbol: haSymbol,
                                                    poolBalance:
                                                      (poolType === "collateral"
                                                        ? requestMarket?.collateralPoolDeposit
                                                        : requestMarket?.sailPoolDeposit) || 0n,
                                                  });
                                                }
                                              }}
                                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                                isWindowOpen
                                                  ? "bg-[#1E4775] text-white hover:bg-[#17395F]"
                                                  : "bg-orange-500 text-white hover:bg-orange-600"
                                              } transition-colors whitespace-nowrap`}
                                            >
                                              Withdraw
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Your Positions - consolidated */}
                              {hasGroupPositions && (
                                <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2">
                                  <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
                                    Your Positions
                                  </div>
                                  <div className="space-y-2">
                                    {/* ha Tokens in Wallet */}
                                    {haTokenBalance && haTokenBalance > 0n && (
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-[#1E4775]/70">In Wallet:</span>
                                        <div className="text-right">
                                          <div className="font-semibold text-[#1E4775] font-mono">
                                            {formatCompactUSD(haTokenBalanceUSD)}
                                          </div>
                                          <div className="text-[10px] text-[#1E4775]/50 font-mono">
                                            {formatToken(haTokenBalance)} {haSymbol}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Collateral Pool Deposit - aggregated */}
                                    {totalCollateralPoolDeposit > 0n && (
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-[#1E4775]/70">Collateral Pool:</span>
                                        <div className="text-right">
                                          <div className="font-semibold text-[#1E4775] font-mono">
                                            {formatCompactUSD(totalCollateralPoolDepositUSD)}
                                          </div>
                                          <div className="text-[10px] text-[#1E4775]/50 font-mono">
                                            {formatToken(totalCollateralPoolDeposit)} {haSymbol}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Sail Pool Deposit - aggregated */}
                                    {totalSailPoolDeposit > 0n && (
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-[#1E4775]/70">Sail Pool:</span>
                                        <div className="text-right">
                                          <div className="font-semibold text-[#1E4775] font-mono">
                                            {formatCompactUSD(totalSailPoolDepositUSD)}
                                          </div>
                                          <div className="text-[10px] text-[#1E4775]/50 font-mono">
                                            {formatToken(totalSailPoolDeposit)} {haSymbol}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {activeMarketsData.map((marketData) => {
                          // Get volatility protection from hook data
                          const minterAddr =
                            marketData.minterAddress?.toLowerCase();
                          const volProtData = minterAddr
                            ? volProtectionData?.get(minterAddr)
                            : undefined;
                          const volatilityProtection =
                            volProtData?.protection ?? "-";

                          // Format min collateral ratio
                          const minCollateralRatioFormatted =
                            marketData.minCollateralRatio
                              ? `${(
                                  Number(marketData.minCollateralRatio) / 1e16
                                ).toFixed(2)}%`
                              : "-";

                          // Calculate USD values for inline display
                          // Default to 18 decimals if collateralPriceDecimals is undefined
                          const priceDecimals =
                            marketData.collateralPriceDecimals ?? 18;
                          const collateralPriceUSD = marketData.collateralPrice
                            ? Number(marketData.collateralPrice) /
                              10 ** priceDecimals
                            : 0;

                          // Total ha tokens (totalDebt is the supply of pegged tokens)
                          const totalHaTokens =
                            marketData.totalDebt !== undefined
                              ? Number(marketData.totalDebt) / 1e18
                              : 0;

                          // Get collateral ratio
                          const collateralRatioNum = marketData.collateralRatio
                            ? Number(marketData.collateralRatio) / 1e18
                            : 0;

                          // Collateral value from collateralTokenBalance * wrappedRate * underlyingPrice
                          // collateralValue is in wrapped tokens (e.g., wstETH) - 18 decimals raw
                          // wrappedRate converts wrapped to underlying (e.g., wstETH to stETH) - 18 decimals raw
                          // collateralPriceUSD is already normalized (e.g., 4400 for $4400)
                          const collateralTokens =
                            marketData.collateralValue !== undefined
                              ? Number(marketData.collateralValue) / 1e18
                              : 0;
                          const wrappedRateNum = marketData.wrappedRate
                            ? Number(marketData.wrappedRate) / 1e18
                            : 1; // Default 1:1 if no rate
                          // Formula: collateralUSD = collateralTokens * wrappedRate * underlyingPriceUSD
                          const collateralValueUSD =
                            collateralTokens > 0 && collateralPriceUSD > 0
                              ? collateralTokens * wrappedRateNum * collateralPriceUSD
                              : 0;

                          // Calculate total debt in USD
                          const peggedPriceUSD =
                            marketData.peggedTokenPrice &&
                            marketData.peggedTokenPrice > 0n
                              ? Number(marketData.peggedTokenPrice) / 1e18
                              : 1; // Default to $1 peg
                          const totalDebtUSD = totalHaTokens * peggedPriceUSD;

                          return (
                            <div
                              key={marketData.marketId}
                              className="bg-white p-2 mb-2 border border-[#1E4775]/10"
                            >
                              <div className="flex items-center justify-end mb-2">
                                <button
                                  onClick={() =>
                                    setContractAddressesModal({
                                      marketId: marketData.marketId,
                                      market: marketData.market,
                                      minterAddress: marketData.minterAddress,
                                    })
                                  }
                                  className="text-[#1E4775]/60 hover:text-[#1E4775] text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <span>Contracts</span>
                                  <ArrowRightIcon className="w-3 h-3" />
                                </button>
                              </div>
                              {(() => {
                                // Calculate TVL in USD for both pools
                                const peggedPriceUSD =
                                  marketData.peggedTokenPrice &&
                                  marketData.peggedTokenPrice > 0n
                                    ? Number(marketData.peggedTokenPrice) / 1e18
                                    : 1; // fallback to $1 peg if price missing

                                const collateralPoolTVLTokens =
                                  marketData.collateralPoolTVL
                                    ? Number(marketData.collateralPoolTVL) /
                                      1e18
                                    : 0;
                                const collateralPoolTVLUSD =
                                  collateralPoolTVLTokens * peggedPriceUSD;

                                const sailPoolTVLTokens = marketData.sailPoolTVL
                                  ? Number(marketData.sailPoolTVL) / 1e18
                                  : 0;
                                const sailPoolTVLUSD =
                                  sailPoolTVLTokens * peggedPriceUSD;

                                return (
                                  <div className="grid grid-cols-3 md:grid-cols-8 gap-1.5">
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Collateral
                                      </div>
                                      <div className="text-xs font-semibold text-[#1E4775]">
                                        {marketData.market.collateral?.symbol ||
                                          "ETH"}
                                      </div>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Min CR
                                      </div>
                                      <div className="text-xs font-semibold text-[#1E4775]">
                                        {minCollateralRatioFormatted}
                                      </div>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Current CR
                                      </div>
                                      <div className="text-xs font-semibold text-[#1E4775]">
                                        {formatRatio(
                                          marketData.collateralRatio
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                                        Vol. Protection
                                        <SimpleTooltip
                                          side="top"
                                          label={
                                            <div className="space-y-2">
                                              <p className="font-semibold mb-1">
                                                Volatility Protection
                                              </p>
                                              <p>
                                                The percentage adverse price
                                                movement between collateral and
                                                the pegged token that the system
                                                can withstand before reaching
                                                the depeg point (100% collateral
                                                ratio).
                                              </p>
                                              <p>
                                                For example, an ETH-pegged token
                                                with USD collateral is protected
                                                against ETH price spikes (ETH
                                                becoming more expensive relative
                                                to USD).
                                              </p>
                                              <p>
                                                This accounts for stability
                                                pools that can rebalance and
                                                improve the collateral ratio
                                                during adverse price movements.
                                              </p>
                                              <p className="text-xs text-gray-400 italic">
                                                Higher percentage = more
                                                protection. Assumes no
                                                additional deposits or
                                                withdrawals.
                                              </p>
                                            </div>
                                          }
                                        >
                                          <span className="text-[#1E4775]/30 cursor-help">
                                            [?]
                                          </span>
                                        </SimpleTooltip>
                                      </div>
                                      <div className="text-xs font-semibold text-[#1E4775]">
                                        {volatilityProtection}
                                      </div>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Collateral (USD)
                                      </div>
                                      <SimpleTooltip
                                        label={`${collateralTokens.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )} ${
                                          marketData.market.collateral
                                            ?.symbol || "ETH"
                                        }`}
                                      >
                                        <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                          {collateralValueUSD > 0
                                            ? `$${collateralValueUSD.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 0,
                                                  maximumFractionDigits: 0,
                                                }
                                              )}`
                                            : collateralValueUSD === 0
                                            ? "$0"
                                            : "-"}
                                        </div>
                                      </SimpleTooltip>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Total{" "}
                                        {marketData.market.peggedToken
                                          ?.symbol || "ha"}
                                      </div>
                                      <SimpleTooltip
                                        label={
                                          totalDebtUSD > 0
                                            ? `$${totalDebtUSD.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 0,
                                                  maximumFractionDigits: 0,
                                                }
                                              )} USD`
                                            : "No tokens minted"
                                        }
                                      >
                                        <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                          {totalHaTokens > 0
                                            ? totalHaTokens.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )
                                            : totalHaTokens === 0
                                            ? "0.00"
                                            : "-"}
                                        </div>
                                      </SimpleTooltip>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Collateral Pool TVL
                                      </div>
                                      <SimpleTooltip
                                        label={
                                          collateralPoolTVLTokens > 0
                                            ? `${collateralPoolTVLTokens.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )} ${
                                                marketData.market.peggedToken
                                                  ?.symbol || "ha"
                                              }`
                                            : "No deposits"
                                        }
                                      >
                                        <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                          {collateralPoolTVLUSD > 0
                                            ? formatCompactUSD(
                                                collateralPoolTVLUSD
                                              )
                                            : collateralPoolTVLUSD === 0
                                            ? "$0"
                                            : "-"}
                                        </div>
                                      </SimpleTooltip>
                                    </div>
                                    <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                      <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                        Sail Pool TVL
                                      </div>
                                      <SimpleTooltip
                                        label={
                                          sailPoolTVLTokens > 0
                                            ? `${sailPoolTVLTokens.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )} ${
                                                marketData.market.peggedToken
                                                  ?.symbol || "ha"
                                              }`
                                            : "No deposits"
                                        }
                                      >
                                        <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                          {sailPoolTVLUSD > 0
                                            ? formatCompactUSD(sailPoolTVLUSD)
                                            : sailPoolTVLUSD === 0
                                            ? "$0"
                                            : "-"}
                                        </div>
                                      </SimpleTooltip>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </section>
        </main>

        {manageModal && (
          <AnchorDepositWithdrawModal
            isOpen={!!manageModal}
            onClose={() => setManageModal(null)}
            marketId={manageModal.marketId}
            market={manageModal.market}
            initialTab={manageModal.initialTab || "mint"}
            simpleMode={true}
            bestPoolType={manageModal.bestPoolType || "collateral"}
            allMarkets={manageModal.allMarkets}
            onSuccess={async () => {
              // Wait for blockchain state to update
              await new Promise((resolve) => setTimeout(resolve, 2000));
              // Refetch all contract data
              await Promise.all([refetchReads(), refetchUserDeposits()]);
            }}
          />
        )}

        {compoundModal && (
          // Convert old compoundModal to new pool selection flow
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => setCompoundModal(null)}
            onConfirm={async (allocations) => {
              setCompoundModal(null);
              try {
                // Calculate reward amount from all pools
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                await handleCompoundConfirm(
                  compoundModal.market,
                  allocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={(() => {
              // Build pools array from the market
              const market = compoundModal.market;
              const collateralPoolAddress = market.addresses
                ?.stabilityPoolCollateral as `0x${string}` | undefined;
              const sailPoolAddress = market.addresses
                ?.stabilityPoolLeveraged as `0x${string}` | undefined;

              const pools: PoolOption[] = [];

              // Get pegged token price for TVL calculation
              let peggedTokenPrice: bigint | undefined;
              const marketIndex = anchorMarkets.findIndex(
                ([id]) =>
                  id === compoundModal.market.id ||
                  (compoundModal.market as any).addresses?.peggedToken
              );
              if (marketIndex >= 0 && reads) {
                let offset = 0;
                for (let i = 0; i < marketIndex; i++) {
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
                  offset += 5;
                  if (prevHasStabilityPoolManager) offset += 1;
                  if (prevHasCollateral) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasSail) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasPriceOracle) offset += 1;
                }
                peggedTokenPrice = reads?.[offset + 3]?.result as
                  | bigint
                  | undefined;
              }

              if (collateralPoolAddress) {
                const collateralPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    collateralPoolAddress.toLowerCase()
                );
                const collateralPoolAPR = collateralPoolData?.totalAPR;

                let collateralTVLUSD: number | undefined;
                if (collateralPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  collateralTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "collateral",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Collateral Pool`,
                  address: collateralPoolAddress,
                  apr: collateralPoolAPR,
                  tvl: collateralPoolData?.tvl,
                  tvlUSD: collateralTVLUSD,
                  enabled: true,
                });
              }

              if (sailPoolAddress) {
                const sailPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    sailPoolAddress.toLowerCase()
                );
                const sailPoolAPR = sailPoolData?.totalAPR;

                let sailTVLUSD: number | undefined;
                if (sailPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(sailPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  sailTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "sail",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Sail Pool`,
                  address: sailPoolAddress,
                  apr: sailPoolAPR,
                  tvl: sailPoolData?.tvl,
                  tvlUSD: sailTVLUSD,
                  enabled: true,
                });
              }

              return pools;
            })()}
            marketSymbol={
              compoundModal.market.peggedToken?.symbol ||
              compoundModal.market.id
            }
          />
        )}

        <AnchorClaimAllModal
          isOpen={isClaimAllModalOpen}
          onClose={() => setIsClaimAllModalOpen(false)}
          onBasicClaim={handleClaimAll}
          onCompound={handleCompoundAll}
          onBuyTide={handleBuyTide}
          positions={(() => {
            // Build positions array using allPoolRewards from useAllStabilityPoolRewards
            const positions: Array<{
              marketId: string;
              market: any;
              poolType: "collateral" | "sail";
              rewards: bigint;
              rewardsUSD: number;
              deposit: bigint;
              depositUSD: number;
              rewardTokens: Array<{
                symbol: string;
                claimable: bigint;
                claimableFormatted: string;
              }>;
            }> = [];

            if (reads && anchorMarkets && allPoolRewards) {
              anchorMarkets.forEach(([id, m], mi) => {
                const hasCollateralPool = !!(m as any).addresses
                  ?.stabilityPoolCollateral;
                const hasSailPool = !!(m as any).addresses
                  ?.stabilityPoolLeveraged;

                // Calculate offset for this market to get deposit data
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

                // Get price oracle for USD calculations
                const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
                const collateralPriceDecimals = 18;
                let collateralPrice: bigint | undefined;
                let priceOffset = currentOffset;
                if (hasCollateralPool) priceOffset += 3;
                if (hasSailPool) priceOffset += 3;
                if (hasPriceOracle) {
                  const latestAnswerResult = reads?.[priceOffset]?.result;
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

                // Collateral pool position
                if (hasCollateralPool) {
                  const collateralPoolAddress = (m as any).addresses
                    ?.stabilityPoolCollateral as `0x${string}`;
                  const collateralPoolDeposit = reads?.[currentOffset]
                    ?.result as bigint | undefined;

                  // Get rewards from allPoolRewards
                  const poolReward = allPoolRewards.find(
                    (pr) =>
                      pr.poolAddress.toLowerCase() ===
                      collateralPoolAddress.toLowerCase()
                  );

                  let depositUSD = 0;
                  let rewardsUSD = poolReward?.claimableValue || 0;

                  // Calculate total rewards as bigint (sum of all reward tokens)
                  const totalRewards =
                    poolReward?.rewardTokens.reduce(
                      (sum, token) => sum + token.claimable,
                      0n
                    ) || 0n;

                  if (
                    collateralPoolDeposit &&
                    collateralPrice &&
                    collateralPriceDecimals !== undefined
                  ) {
                    const price =
                      Number(collateralPrice) /
                      10 ** (Number(collateralPriceDecimals) || 8);
                    const depositAmount = Number(collateralPoolDeposit) / 1e18;
                    depositUSD = depositAmount * price;
                  }

                  // Only include if there are rewards
                  if (poolReward && poolReward.claimableValue > 0) {
                    positions.push({
                      marketId: id,
                      market: m,
                      poolType: "collateral",
                      rewards: totalRewards,
                      rewardsUSD,
                      deposit: collateralPoolDeposit || 0n,
                      depositUSD,
                      rewardTokens: poolReward.rewardTokens.map((token) => ({
                        symbol: token.symbol,
                        claimable: token.claimable,
                        claimableFormatted: formatEther(token.claimable),
                      })),
                    });
                  }

                  currentOffset += 3;
                }

                // Sail pool position
                if (hasSailPool) {
                  const sailPoolAddress = (m as any).addresses
                    ?.stabilityPoolLeveraged as `0x${string}`;
                  const sailPoolDeposit = reads?.[currentOffset]?.result as
                    | bigint
                    | undefined;

                  // Get rewards from allPoolRewards
                  const poolReward = allPoolRewards.find(
                    (pr) =>
                      pr.poolAddress.toLowerCase() ===
                      sailPoolAddress.toLowerCase()
                  );

                  let depositUSD = 0;
                  let rewardsUSD = poolReward?.claimableValue || 0;

                  // Calculate total rewards as bigint (sum of all reward tokens)
                  const totalRewards =
                    poolReward?.rewardTokens.reduce(
                      (sum, token) => sum + token.claimable,
                      0n
                    ) || 0n;

                  if (
                    sailPoolDeposit &&
                    peggedTokenPrice &&
                    collateralPrice &&
                    collateralPriceDecimals !== undefined
                  ) {
                    const peggedPrice = Number(peggedTokenPrice) / 1e18;
                    const collateralPriceNum =
                      Number(collateralPrice) /
                      10 ** (Number(collateralPriceDecimals) || 8);
                    const depositAmount = Number(sailPoolDeposit) / 1e18;
                    depositUSD =
                      depositAmount * (peggedPrice * collateralPriceNum);
                  }

                  // Only include if there are rewards
                  if (poolReward && poolReward.claimableValue > 0) {
                    positions.push({
                      marketId: id,
                      market: m,
                      poolType: "sail",
                      rewards: totalRewards,
                      rewardsUSD,
                      deposit: sailPoolDeposit || 0n,
                      depositUSD,
                      rewardTokens: poolReward.rewardTokens.map((token) => ({
                        symbol: token.symbol,
                        claimable: token.claimable,
                        claimableFormatted: formatEther(token.claimable),
                      })),
                    });
                  }
                }
              });
            }

            return positions;
          })()}
          isLoading={isClaimingAll || isCompoundingAll}
        />

        {selectedMarketForClaim && (
          <AnchorClaimMarketModal
            isOpen={isClaimMarketModalOpen}
            onClose={() => setIsClaimMarketModalOpen(false)}
            onBasicClaim={handleClaimMarketBasicClaim}
            onCompound={handleClaimMarketCompound}
            onBuyTide={handleClaimMarketBuyTide}
            marketSymbol={
              anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1]
                ?.peggedToken?.symbol || "Market"
            }
            isLoading={isClaiming || isCompounding}
          />
        )}

        {/* Compound Pool Selection Modal */}
        {compoundPoolSelection && (
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => {
              setCompoundPoolSelection(null);
            }}
            onConfirm={async (allocations) => {
              setCompoundPoolSelection(null);
              try {
                // Calculate reward amount from all pools
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                await handleCompoundConfirm(
                  compoundPoolSelection.market,
                  allocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                // Show error in a simple alert or toast
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={compoundPoolSelection.pools}
            marketSymbol={
              compoundPoolSelection.market.peggedToken?.symbol ||
              compoundPoolSelection.market.id
            }
          />
        )}

        {compoundConfirmation && (
          <CompoundConfirmationModal
            isOpen={true}
            onClose={() => {
              setCompoundConfirmation(null);
              setIsCompounding(false);
            }}
            onConfirm={compoundConfirmation.onConfirm}
            steps={compoundConfirmation.steps}
            fees={compoundConfirmation.fees}
            feeErrors={compoundConfirmation.feeErrors}
          />
        )}

        {/* Early withdraw confirmation */}
        {earlyWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white shadow-xl max-w-md w-full p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#1E4775] font-semibold">
                  Withdraw early?
                </h3>
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-[#1E4775]/80">
                Withdrawing now will incur the early withdrawal fee. The
                fee-free window opens in{""}
                {formatTimeRemaining(Number(earlyWithdrawModal.start) * 1000)}
                {""}
                and closes at{""}
                {formatDateTime(
                  new Date(Number(earlyWithdrawModal.end) * 1000)
                )}
                .
              </p>
              <div className="text-xs text-[#1E4775]/70 mt-2">
                Fee:{""}
                {(Number(earlyWithdrawModal.earlyWithdrawFee) / 1e16).toFixed(
                  2
                )}
                %
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="px-3 py-1 text-sm rounded-full border border-[#1E4775]/30 text-[#1E4775]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                    setWithdrawAmountModal({
                      poolAddress: earlyWithdrawModal.poolAddress,
                      poolType: earlyWithdrawModal.poolType,
                      useEarly: true,
                      symbol: earlyWithdrawModal.symbol,
                      maxAmount: earlyWithdrawModal.poolBalance || 0n,
                    });
                    setEarlyWithdrawModal(null);
                  }}
                  className="px-3 py-1 text-sm rounded-full bg-orange-500 text-white hover:bg-orange-600"
                >
                  Continue with fee
                </button>
              </div>
            </div>
          </div>
        )}

        {withdrawAmountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[#1E4775] font-semibold text-lg">
                  {withdrawAmountModal.useEarly
                    ? "Withdraw (fee applies)"
                    : "Withdraw"}
                </h3>
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-[#1E4775]">
                    Enter Amount
                  </label>
                  {withdrawAmountModal?.maxAmount !== undefined && (
                    <span className="text-sm text-[#1E4775]/70">
                      Balance: {formatToken(withdrawAmountModal.maxAmount)}
                      {""}
                      {withdrawAmountModal.symbol || "pegged"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={withdrawAmountInput}
                    onChange={(e) => {
                      setWithdrawAmountInput(e.target.value);
                      setWithdrawAmountError(null);
                    }}
                    type="text"
                    placeholder="0.0"
                    className={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 ${
                      withdrawAmountError
                        ? "border-red-500"
                        : "border-[#1E4775]/30"
                    } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono `}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!withdrawAmountModal?.maxAmount) return;
                      setWithdrawAmountInput(
                        formatEther(withdrawAmountModal.maxAmount)
                      );
                      setWithdrawAmountError(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full font-medium"
                  >
                    MAX
                  </button>
                </div>
                {withdrawAmountError && (
                  <p className="mt-2 text-sm text-red-600">
                    {withdrawAmountError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-full border-2 border-[#1E4775]/30 text-[#1E4775] font-semibold hover:bg-[#1E4775]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!withdrawAmountModal) return;
                    const raw = withdrawAmountInput.trim();
                    if (!raw) {
                      setWithdrawAmountError("Enter an amount to withdraw");
                      return;
                    }

                    let amountValue: bigint | undefined;
                    try {
                      amountValue = parseEther(raw);
                    } catch {
                      setWithdrawAmountError("Enter a valid amount");
                      return;
                    }

                    await handlePendingWithdraw(
                      withdrawAmountModal.poolAddress,
                      withdrawAmountModal.poolType,
                      withdrawAmountModal.useEarly,
                      amountValue
                    );

                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-full font-semibold text-white transition-colors ${
                    withdrawAmountModal.useEarly
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-[#1E4775] hover:bg-[#17395F]"
                  }`}
                >
                  Confirm Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Progress Modal */}
        {transactionProgress && (
          <TransactionProgressModal
            isOpen={transactionProgress.isOpen}
            onClose={() => {
              setTransactionProgress(null);
            }}
            title={transactionProgress.title}
            steps={transactionProgress.steps}
            currentStepIndex={transactionProgress.currentStepIndex}
            onCancel={() => {
              if (cancelOperationRef.current) {
                // Call the cancel handler for claim all or compound
                cancelOperationRef.current();
                cancelOperationRef.current = null;
              } else {
                setTransactionProgress(null);
              }
            }}
            canCancel={isClaimingAll || isCompounding}
          />
        )}

        {/* Contract Addresses Modal */}
        {contractAddressesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setContractAddressesModal(null)}
          >
            <div
              className="bg-white p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1E4775]">
                  Contract Addresses
                </h2>
                <button
                  onClick={() => setContractAddressesModal(null)}
                  className="text-[#1E4775]/70 hover:text-[#1E4775]"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Minter</div>
                  <SharedEtherscanLink
                    label=""
                    address={contractAddressesModal.minterAddress}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolCollateral
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Sail Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolLeveraged
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">ha Token</div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.peggedToken
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Token
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralToken
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Price Oracle
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralPrice
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
