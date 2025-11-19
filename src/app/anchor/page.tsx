"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useAccount, useContractReads, useWriteContract, usePublicClient, useContractRead } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { markets } from "@/config/markets";
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
import { AnchorClaimMarketModal } from "@/components/AnchorClaimMarketModal";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { aprABI } from "@/abis/apr";
import { rewardsABI } from "@/abis/rewards";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";
import Image from "next/image";

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

const chainlinkOracleABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Helper function to get logo path for tokens
function getAcceptedDepositAssets(
  collateralSymbol: string
): Array<{ symbol: string; name: string }> {
  const normalized = collateralSymbol.toLowerCase();
  if (normalized === "fxsave") {
    // USD-based markets: fxSAVE, fxUSD, USDC
    return [
      { symbol: "fxSAVE", name: "fxSAVE" },
      { symbol: "fxUSD", name: "fxUSD" },
      { symbol: "USDC", name: "USDC" },
    ];
  } else if (normalized === "wsteth") {
    // ETH-based markets: ETH, stETH, wstETH
    return [
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped Staked ETH" },
    ];
  }
  return [];
}

function getLogoPath(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();
  if (normalizedSymbol === "eth" || normalizedSymbol === "ethereum") {
    return "/icons/eth.png";
  }
  if (normalizedSymbol === "fxsave") {
    return "/icons/fxSave.png";
  }
  if (normalizedSymbol === "fxusd") {
    return "/icons/fxUSD.webp";
  }
  if (normalizedSymbol === "usdc") {
    return "/icons/usdc.webp";
  }
  if (normalizedSymbol === "steth") {
    return "/icons/steth_logo.webp";
  }
  if (normalizedSymbol === "wsteth") {
    return "/icons/wstETH.webp";
  }
  return "/icons/placeholder.svg";
}

function formatToken(
  value: bigint | undefined,
  decimals = 18,
  maxFrac = 4
): string {
  if (!value) return "0";
  const n = Number(value) / 10 ** decimals;
  if (n > 0 && n < 1 / 10 ** maxFrac)
    return `<${(1 / 10 ** maxFrac).toFixed(maxFrac)}`;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function formatRatio(value: bigint | undefined): string {
  if (!value) return "-";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

function formatAPR(apr: number | undefined): string {
  if (apr === undefined || isNaN(apr)) return "-";
  return `${apr.toFixed(2)}%`;
}

function calculateVolatilityRisk(
  collateralValue: bigint | undefined,
  totalDebt: bigint | undefined,
  collateralPoolTVL: bigint | undefined,
  sailPoolTVL: bigint | undefined,
  peggedTokenPrice: bigint | undefined
): string {
  if (!collateralValue || !totalDebt || !peggedTokenPrice) return "-";

  // Convert pool TVLs from pegged tokens to collateral value
  // Stability pools contain pegged tokens, so we need to convert them to their collateral value
  // peggedTokenPrice is in 18 decimals, representing the NAV (collateral value per pegged token)
  
  const collateralPoolDebtReduction = collateralPoolTVL || 0n;
  const sailPoolDebtReduction = sailPoolTVL || 0n;
  
  // Total debt reduction from pools (in pegged tokens)
  const totalDebtReduction = collateralPoolDebtReduction + sailPoolDebtReduction;
  
  // Remaining debt after pools are drained
  const remainingDebt = totalDebt > totalDebtReduction ? totalDebt - totalDebtReduction : 0n;
  
  // When collateral pool is drained, it redeems pegged tokens for collateral
  // The collateral removed is approximately equal to the value of pegged tokens redeemed
  // peggedTokenPrice gives us the collateral value per pegged token
  const collateralRemovedFromPool = (collateralPoolDebtReduction * peggedTokenPrice) / (10n ** 18n);
  
  // Remaining collateral after pool drain
  const remainingCollateral = collateralValue > collateralRemovedFromPool 
    ? collateralValue - collateralRemovedFromPool 
    : 0n;
  
  // If remaining debt is 0 or remaining collateral is 0, market is already at risk
  if (remainingDebt === 0n || remainingCollateral === 0n) {
    return "0%";
  }
  
  // Calculate required price drop to reach 100% CR (1.0)
  // Target: remainingCollateral * (1 - priceDrop) / remainingDebt = 1.0
  // Therefore: priceDrop = 1 - (remainingDebt / remainingCollateral)
  
  // Convert to numbers for calculation (using 18 decimals precision)
  const remainingCollateralNum = Number(remainingCollateral);
  const remainingDebtNum = Number(remainingDebt);
  
  if (remainingDebtNum >= remainingCollateralNum) {
    return "0%"; // Already at or below 100% CR
  }
  
  const priceDropRatio = 1 - (remainingDebtNum / remainingCollateralNum);
  const priceDropPercent = priceDropRatio * 100;
  
  if (priceDropPercent <= 0) return "0%";
  if (priceDropPercent >= 100) return "100%";
  
  return `${priceDropPercent.toFixed(2)}%`;
}

// Helper component for Etherscan links
function EtherscanLink({ label, address }: { label: string; address: string | undefined }) {
  if (!address) return null;
  const etherscanBaseUrl = "https://etherscan.io/address/";
  const displayText = label || `${address.slice(0, 6)}...${address.slice(-4)}`;
  return (
    <a
      href={`${etherscanBaseUrl}${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[#1E4775] hover:text-[#17395F] underline flex items-center gap-1"
    >
      {displayText}
      <ArrowRightIcon className="w-3 h-3" />
    </a>
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
  onClaimCollateralRewards,
  onCompoundCollateralRewards,
  onClaimSailRewards,
  onCompoundSailRewards,
  isClaiming,
  isCompounding,
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
  onClaimCollateralRewards: () => void;
  onCompoundCollateralRewards: () => void;
  onClaimSailRewards: () => void;
  onCompoundSailRewards: () => void;
  isClaiming: boolean;
  isCompounding: boolean;
}) {
  const volatilityRisk = calculateVolatilityRisk(
    collateralValue,
    totalDebt,
    collateralPoolTVL,
    sailPoolTVL,
    peggedTokenPrice
  );

  const hasCollateralRewards = collateralPoolRewards && collateralPoolRewards > 0n;
  const hasSailRewards = sailPoolRewards && sailPoolRewards > 0n;

  // Calculate additional metrics
  const minCollateralRatio = 100; // Default to 100% (1.0), could be fetched from config if available
  const currentCR = collateralRatio ? Number(collateralRatio) / 1e16 : 0;
  const safetyBuffer = currentCR > minCollateralRatio ? ((currentCR - minCollateralRatio) / minCollateralRatio * 100) : 0;

  // Calculate pool shares
  const collateralPoolShare = collateralPoolTVL && collateralPoolDeposit
    ? (Number(collateralPoolDeposit) / Number(collateralPoolTVL)) * 100
    : 0;
  const sailPoolShare = sailPoolTVL && sailPoolDeposit
    ? (Number(sailPoolDeposit) / Number(sailPoolTVL)) * 100
    : 0;

  // Calculate estimated yields
  const collateralPoolAPRTotal = collateralPoolAPR
    ? (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0)
    : 0;
  const sailPoolAPRTotal = sailPoolAPR
    ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
    : 0;

  // Weighted average APR based on deposits
  const totalDepositUSD = collateralPoolDepositUSD + sailPoolDepositUSD;
  let weightedAPR = 0;
  if (totalDepositUSD > 0) {
    weightedAPR = (
      (collateralPoolDepositUSD * collateralPoolAPRTotal) +
      (sailPoolDepositUSD * sailPoolAPRTotal)
    ) / totalDepositUSD;
  }

  // Estimated annual yield
  const estimatedAnnualYield = totalDepositUSD * (weightedAPR / 100);
  const estimatedDailyEarnings = estimatedAnnualYield / 365;
  const estimatedWeeklyEarnings = estimatedAnnualYield / 52;

  // Pegged token price in USD
  const peggedTokenPriceUSD = peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined
    ? (Number(peggedTokenPrice) / 1e18) * (Number(collateralPrice) / (10 ** collateralPriceDecimals))
    : 0;

  // Total supply (outstanding ha tokens)
  const totalSupply = totalDebt ? formatToken(totalDebt) : "0";

  return (
    <div className="bg-[#B8EBD5] p-2 border-t border-white/20">
      {/* Market Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Collateral Ratio</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {formatRatio(collateralRatio)}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Min Collateral Ratio</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {minCollateralRatio}%
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Safety: {safetyBuffer.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Total Debt</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {totalSupply}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.peggedToken?.symbol || "ha"}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Volatility Risk</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {volatilityRisk}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            Price drop to &lt;100% CR
          </p>
        </div>
      </div>

      {/* Token Price & Supply */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Pegged Token Price</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            ${peggedTokenPriceUSD > 0 ? peggedTokenPriceUSD.toFixed(4) : "-"}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            NAV per {market.peggedToken?.symbol || "ha"}
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Total Supply</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {totalSupply}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.peggedToken?.symbol || "ha"} tokens
          </p>
        </div>

        <div className="bg-white p-3 h-full flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Collateral Value</h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {formatToken(collateralValue)}
          </p>
          <p className="text-xs text-[#1E4775]/70 mt-0.5">
            {market.collateral?.symbol || "ETH"}
          </p>
        </div>
      </div>

      {/* APR Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        {market.addresses?.stabilityPoolCollateral && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Collateral Pool APR</h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {formatAPR(collateralPoolAPRTotal)}
            </p>
            {collateralPoolDepositUSD > 0 && (
              <p className="text-xs text-[#1E4775]/70 mt-0.5">
                Your share: {collateralPoolShare.toFixed(2)}%
              </p>
            )}
          </div>
        )}

        {market.addresses?.stabilityPoolLeveraged && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Sail Pool APR</h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {formatAPR(sailPoolAPRTotal)}
            </p>
            {sailPoolDepositUSD > 0 && (
              <p className="text-xs text-[#1E4775]/70 mt-0.5">
                Your share: {sailPoolShare.toFixed(2)}%
              </p>
            )}
          </div>
        )}
      </div>

      {/* Your Yield Estimates */}
      {totalDepositUSD > 0 && (
        <div className="bg-white p-3 mb-2">
          <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Your Estimated Yield</h3>
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
            <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">Collateral Pool Rewards</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#1E4775]/70">Claimable:</span>
                <span className="text-sm font-bold text-[#1E4775] font-mono">
                  {hasCollateralRewards ? formatToken(collateralPoolRewards) : "0"} {market.collateral?.symbol || "ETH"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClaimCollateralRewards}
                  disabled={!hasCollateralRewards || isClaiming || isCompounding}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
                >
                  Claim
                </button>
                <button
                  onClick={onCompoundCollateralRewards}
                  disabled={!hasCollateralRewards || isClaiming || isCompounding}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
                >
                  Compound
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sail Pool Rewards */}
        {market.addresses?.stabilityPoolLeveraged && (
          <div className="bg-white p-3">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">Sail Pool Rewards</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#1E4775]/70">Claimable:</span>
                <span className="text-sm font-bold text-[#1E4775] font-mono">
                  {hasSailRewards ? formatToken(sailPoolRewards) : "0"} {market.leveragedToken?.symbol || "hs"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClaimSailRewards}
                  disabled={!hasSailRewards || isClaiming || isCompounding}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
                >
                  Claim
                </button>
                <button
                  onClick={onCompoundSailRewards}
                  disabled={!hasSailRewards || isClaiming || isCompounding}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
                >
                  Compound
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Your Position Section */}
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-sm">Your Position</h3>
        <div className="space-y-2">
          {/* Collateral Pool Deposit */}
          {market.addresses?.stabilityPoolCollateral && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#1E4775]/70">Collateral Pool:</span>
                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">collateral</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#1E4775] font-mono">
                  ${collateralPoolDepositUSD.toFixed(2)}
                </div>
                {collateralPoolDeposit && collateralPoolDeposit > 0n && (
                  <div className="text-xs text-[#1E4775]/70 font-mono">
                    {formatToken(collateralPoolDeposit)} {market.peggedToken?.symbol || "ha"}
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
                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">sail</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#1E4775] font-mono">
                  ${sailPoolDepositUSD.toFixed(2)}
                </div>
                {sailPoolDeposit && sailPoolDeposit > 0n && (
                  <div className="text-xs text-[#1E4775]/70 font-mono">
                    {formatToken(sailPoolDeposit)} {market.peggedToken?.symbol || "ha"}
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
                ${haTokenBalanceUSD.toFixed(2)}
              </div>
              {haTokenBalance && haTokenBalance > 0n && (
                <div className="text-xs text-[#1E4775]/70 font-mono">
                  {formatToken(haTokenBalance)} {market.peggedToken?.symbol || "ha"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Information */}
      <div className="bg-white p-3 mt-0">
        <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">Contract Addresses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <EtherscanLink label="Minter" address={minterAddress} />
            <EtherscanLink 
              label="Collateral Pool" 
              address={(market as any).addresses?.stabilityPoolCollateral} 
            />
            <EtherscanLink 
              label="Sail Pool" 
              address={(market as any).addresses?.stabilityPoolLeveraged} 
            />
          </div>
          <div className="space-y-1">
            <EtherscanLink 
              label="ha Token" 
              address={(market as any).addresses?.peggedToken} 
            />
            <EtherscanLink 
              label="Collateral Token" 
              address={(market as any).addresses?.collateralToken} 
            />
            <EtherscanLink 
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
    initialTab?: "mint" | "deposit" | "withdraw" | "redeem";
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
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isCompoundingAll, setIsCompoundingAll] = useState(false);
  const [isEarningsExpanded, setIsEarningsExpanded] = useState(false);
  const [isClaimAllModalOpen, setIsClaimAllModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMarketForClaim, setSelectedMarketForClaim] = useState<string | null>("all");
  const [isClaimMarketModalOpen, setIsClaimMarketModalOpen] = useState(false);
  const [contractAddressesModal, setContractAddressesModal] = useState<{
    marketId: string;
    market: any;
    minterAddress: string;
  } | null>(null);
  

  // Get all markets with pegged tokens
  const anchorMarkets = useMemo(
    () =>
      Object.entries(markets).filter(([_, m]) => m.peggedToken),
    []
  );

  const queryClient = useQueryClient();

  // Fetch contract data for all markets
  const { data: reads, refetch: refetchReads } = useContractReads({
    contracts: anchorMarkets.flatMap(([_, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      const collateralStabilityPool = (m as any).addresses?.stabilityPoolCollateral as
        | `0x${string}`
        | undefined;
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

      const contracts = [
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralRatio" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralTokenBalance" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "peggedTokenBalance" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "peggedTokenPrice" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "config" as const,
        },
      ];

      // Add collateral stability pool data
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
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: collateralStabilityPool,
            abi: rewardsABI,
            functionName: "getClaimableRewards" as const,
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: collateralStabilityPool,
            abi: stabilityPoolABI,
            functionName: "assetBalanceOf" as const,
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          }
        );
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
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: sailStabilityPool,
            abi: rewardsABI,
            functionName: "getClaimableRewards" as const,
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          },
          {
            address: sailStabilityPool,
            abi: stabilityPoolABI,
            functionName: "assetBalanceOf" as const,
            args: address ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
          }
        );
      }

      // Add collateral price oracle data for USD calculations
      const collateralPriceOracle = (m as any).addresses?.collateralPrice as `0x${string}` | undefined;
      if (
        collateralPriceOracle &&
        typeof collateralPriceOracle === "string" &&
        collateralPriceOracle.startsWith("0x") &&
        collateralPriceOracle.length === 42
      ) {
        contracts.push(
          {
            address: collateralPriceOracle,
            abi: chainlinkOracleABI,
            functionName: "decimals" as const,
          },
          {
            address: collateralPriceOracle,
            abi: chainlinkOracleABI,
            functionName: "latestAnswer" as const,
          }
        );
      }

      return contracts;
    }),
    query: {
      enabled: anchorMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });

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

  const { data: userDepositReads, refetch: refetchUserDeposits } = useContractReads({
    contracts: userDepositContracts.map((c) => c.contract),
    query: {
      enabled: anchorMarkets.length > 0 && !!address,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });

  // Create a map for quick lookup: marketIndex -> deposit balance
  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      map.set(marketIndex, userDepositReads?.[contractIndex]?.result as bigint | undefined);
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  // Group markets by peggedToken.symbol (for grouping ha tokens)
  const groupedMarkets = useMemo(() => {
    if (!reads) return null;

    const groups: Record<string, Array<{
      marketId: string;
      market: any;
      marketIndex: number;
    }>> = {};

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
        const hasCollateralPool = !!(market as any).addresses?.stabilityPoolCollateral;
        const hasSailPool = !!(market as any).addresses?.stabilityPoolLeveraged;
        
        // Calculate offset for this market
        let offset = 0;
        for (let i = 0; i < marketIndex; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
          offset += 5; // 4 minter calls + 1 config call
          if (prevHasCollateral) offset += 4;
          if (prevHasSail) offset += 4;
          if (prevHasPriceOracle) offset += 2;
        }

        const baseOffset = offset;
        const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
        
        let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
        let collateralPoolAPR: { collateral: number; steam: number } | undefined;
        let sailPoolAPR: { collateral: number; steam: number } | undefined;
        let collateralPoolRewards: bigint | undefined;
        let sailPoolRewards: bigint | undefined;
        let collateralPoolDeposit: bigint | undefined;
        let sailPoolDeposit: bigint | undefined;

        if (hasCollateralPool) {
          const collateralAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
          collateralPoolAPR = collateralAPRResult
            ? {
                collateral: Number(collateralAPRResult[0]) / 1e16 * 100,
                steam: Number(collateralAPRResult[1]) / 1e16 * 100,
              }
            : undefined;
          collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
          collateralPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
          currentOffset += 4;
        }

        if (hasSailPool) {
          const sailAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
          sailPoolAPR = sailAPRResult
            ? {
                collateral: Number(sailAPRResult[0]) / 1e16 * 100,
                steam: Number(sailAPRResult[1]) / 1e16 * 100,
              }
            : undefined;
          sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
          sailPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
          currentOffset += 4;
        }

        // Get price oracle for USD calculations
        const hasPriceOracle = !!(market as any).addresses?.collateralPrice;
        let collateralPriceDecimals: number | undefined;
        let collateralPrice: bigint | undefined;
        if (hasPriceOracle) {
          collateralPriceDecimals = reads?.[currentOffset]?.result as number | undefined;
          const priceRaw = reads?.[currentOffset + 1]?.result as bigint | undefined;
          collateralPrice = priceRaw;
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
        if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
          const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
          const collateralAmount = Number(collateralPoolRewards) / 1e18;
          totalRewardsUSD += collateralAmount * price;
        }
        if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
          const peggedPrice = Number(peggedTokenPrice) / 1e18;
          const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
          const leveragedAmount = Number(sailPoolRewards) / 1e18;
          totalRewardsUSD += leveragedAmount * (peggedPrice * collateralPriceNum);
        }

        // Calculate position USD and track deposits
        const userDeposit = userDepositMap.get(marketIndex) || 0n;
        if (collateralPoolDeposit && collateralPoolDeposit > 0n) {
          hasStabilityPoolDeposits = true;
          if (collateralPrice && collateralPriceDecimals !== undefined) {
            const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
            const depositAmount = Number(collateralPoolDeposit) / 1e18;
            totalPositionUSD += depositAmount * price;
          }
        }
        if (sailPoolDeposit && sailPoolDeposit > 0n) {
          hasStabilityPoolDeposits = true;
          if (peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
            const peggedPrice = Number(peggedTokenPrice) / 1e18;
            const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
            const depositAmount = Number(sailPoolDeposit) / 1e18;
            totalPositionUSD += depositAmount * (peggedPrice * collateralPriceNum);
          }
        }
        if (userDeposit && userDeposit > 0n) {
          hasHaTokens = true;
          if (peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
            const peggedPrice = Number(peggedTokenPrice) / 1e18;
            const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
            const depositAmount = Number(userDeposit) / 1e18;
            totalPositionUSD += depositAmount * (peggedPrice * collateralPriceNum);
          }
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
  }, [reads, anchorMarkets, userDepositMap]);

  // Claim and compound handlers
  const handleClaimRewards = async (
    market: any,
    poolType: "collateral" | "sail"
  ) => {
    if (!address) return;
    const poolAddress = poolType === "collateral"
      ? (market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined)
      : (market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined);
    
    if (!poolAddress) return;

    try {
      setIsClaiming(true);
      const hash = await writeContractAsync({
        address: poolAddress,
        abi: rewardsABI,
        functionName: "claimRewards",
      });
      await publicClient?.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([
        refetchReads(),
        refetchUserDeposits(),
      ]);
    } catch (error) {
      console.error("Claim rewards error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCompoundRewards = (
    market: any,
    poolType: "collateral" | "sail",
    rewardAmount: bigint
  ) => {
    setCompoundModal({
      marketId: market.id || "",
      market,
      poolType,
      rewardAmount,
    });
  };

  const handleCompoundConfirm = async (
    market: any,
    poolType: "collateral" | "sail",
    rewardAmount: bigint
  ) => {
    if (!address) return;
    
    const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
    const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined;
    const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined;
    const collateralAddress = market.addresses?.collateralToken as `0x${string}` | undefined;
    const peggedTokenAddress = market.addresses?.peggedToken as `0x${string}` | undefined;
    const leveragedTokenAddress = market.addresses?.leveragedToken as `0x${string}` | undefined;

    if (!minterAddress || !address) return;

    try {
      setIsCompounding(true);

      if (poolType === "collateral") {
        // Collateral pool: claim → mint → deposit
        if (!collateralPoolAddress || !collateralAddress || !peggedTokenAddress) return;

        // Step 1: Claim rewards
        const claimHash = await writeContractAsync({
          address: collateralPoolAddress,
          abi: rewardsABI,
          functionName: "claimRewards",
        });
        await publicClient?.waitForTransactionReceipt({ hash: claimHash as `0x${string}` });

        // Step 2: Calculate mint output and mint pegged tokens
        const expectedOutput = await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateMintPeggedTokenOutput",
          args: [rewardAmount],
        }) as bigint | undefined;

        if (!expectedOutput) throw new Error("Failed to calculate mint output");

        // Approve collateral for minter if needed
        const allowance = await publicClient?.readContract({
          address: collateralAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        }) as bigint | undefined;

        if (!allowance || allowance < rewardAmount) {
          const approveHash = await writeContractAsync({
            address: collateralAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, rewardAmount],
          });
          await publicClient?.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        }

        // Mint pegged tokens
        const minPeggedOut = (expectedOutput * 99n) / 100n;
        const mintHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "mintPeggedToken",
          args: [rewardAmount, address, minPeggedOut],
        });
        await publicClient?.waitForTransactionReceipt({ hash: mintHash as `0x${string}` });

        // Step 3: Approve and deposit to stability pool
        const peggedAllowance = await publicClient?.readContract({
          address: peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, collateralPoolAddress],
        }) as bigint | undefined;

        if (!peggedAllowance || peggedAllowance < expectedOutput) {
          const approvePeggedHash = await writeContractAsync({
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [collateralPoolAddress, expectedOutput],
          });
          await publicClient?.waitForTransactionReceipt({ hash: approvePeggedHash as `0x${string}` });
        }

        const depositHash = await writeContractAsync({
          address: collateralPoolAddress,
          abi: stabilityPoolABI,
          functionName: "deposit",
          args: [expectedOutput, address, 0n],
        });
        await publicClient?.waitForTransactionReceipt({ hash: depositHash as `0x${string}` });
      } else {
        // Sail pool: claim → redeem → mint → deposit
        if (!sailPoolAddress || !leveragedTokenAddress || !collateralAddress || !peggedTokenAddress || !collateralPoolAddress) return;

        // Step 1: Claim rewards
        const claimHash = await writeContractAsync({
          address: sailPoolAddress,
          abi: rewardsABI,
          functionName: "claimRewards",
        });
        await publicClient?.waitForTransactionReceipt({ hash: claimHash as `0x${string}` });

        // Step 2: Calculate redeem output and redeem leveraged tokens for collateral
        const collateralFromRedeem = await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateRedeemLeveragedTokenOutput",
          args: [rewardAmount],
        }) as bigint | undefined;

        if (!collateralFromRedeem) throw new Error("Failed to calculate redeem output");

        // Approve leveraged token for minter if needed
        const leveragedAllowance = await publicClient?.readContract({
          address: leveragedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        }) as bigint | undefined;

        if (!leveragedAllowance || leveragedAllowance < rewardAmount) {
          const approveLeveragedHash = await writeContractAsync({
            address: leveragedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, rewardAmount],
          });
          await publicClient?.waitForTransactionReceipt({ hash: approveLeveragedHash as `0x${string}` });
        }

        // Redeem leveraged tokens for collateral
        const minCollateralOut = (collateralFromRedeem * 99n) / 100n;
        const redeemHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [rewardAmount, address, minCollateralOut],
        });
        await publicClient?.waitForTransactionReceipt({ hash: redeemHash as `0x${string}` });

        // Step 3: Calculate mint output and mint pegged tokens
        const expectedOutput = await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateMintPeggedTokenOutput",
          args: [collateralFromRedeem],
        }) as bigint | undefined;

        if (!expectedOutput) throw new Error("Failed to calculate mint output");

        // Approve collateral for minter if needed
        const collateralAllowance = await publicClient?.readContract({
          address: collateralAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        }) as bigint | undefined;

        if (!collateralAllowance || collateralAllowance < collateralFromRedeem) {
          const approveCollateralHash = await writeContractAsync({
            address: collateralAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, collateralFromRedeem],
          });
          await publicClient?.waitForTransactionReceipt({ hash: approveCollateralHash as `0x${string}` });
        }

        // Mint pegged tokens
        const minPeggedOut = (expectedOutput * 99n) / 100n;
        const mintHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "mintPeggedToken",
          args: [collateralFromRedeem, address, minPeggedOut],
        });
        await publicClient?.waitForTransactionReceipt({ hash: mintHash as `0x${string}` });

        // Step 4: Approve and deposit to stability pool
        const peggedAllowance = await publicClient?.readContract({
          address: peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, collateralPoolAddress],
        }) as bigint | undefined;

        if (!peggedAllowance || peggedAllowance < expectedOutput) {
          const approvePeggedHash = await writeContractAsync({
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [collateralPoolAddress, expectedOutput],
          });
          await publicClient?.waitForTransactionReceipt({ hash: approvePeggedHash as `0x${string}` });
        }

        const depositHash = await writeContractAsync({
          address: collateralPoolAddress,
          abi: stabilityPoolABI,
          functionName: "deposit",
          args: [expectedOutput, address, 0n],
        });
        await publicClient?.waitForTransactionReceipt({ hash: depositHash as `0x${string}` });
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([
        refetchReads(),
        refetchUserDeposits(),
      ]);
    } catch (error) {
      console.error("Compound error:", error);
      throw error;
    } finally {
      setIsCompounding(false);
    }
  };

  // Claim all, compound all, and buy $TIDE handlers
  const handleClaimAll = async (selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }> = []) => {
    if (!address || isClaimingAll) return;
    try {
      setIsClaimingAll(true);
      
      // If no pools selected, claim from all pools (backward compatibility)
      const poolsToClaim = selectedPools.length > 0 
        ? selectedPools 
        : anchorMarkets.flatMap(([id, m]) => {
            const pools: Array<{ marketId: string; poolType: "collateral" | "sail" }> = [];
            if ((m as any).addresses?.stabilityPoolCollateral) {
              pools.push({ marketId: id, poolType: "collateral" });
            }
            if ((m as any).addresses?.stabilityPoolLeveraged) {
              pools.push({ marketId: id, poolType: "sail" });
            }
            return pools;
          });
      
      for (const { marketId, poolType } of poolsToClaim) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        
        try {
          await handleClaimRewards(market, poolType);
        } catch (e) {
          console.error(`Failed to claim ${poolType} rewards for ${marketId}:`, e);
        }
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([
        refetchReads(),
        refetchUserDeposits(),
      ]);
    } catch (error) {
      console.error("Claim all error:", error);
    } finally {
      setIsClaimingAll(false);
    }
  };

  const handleCompoundAll = async (selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }> = []) => {
    if (!address || isCompoundingAll) return;
    try {
      setIsCompoundingAll(true);
      
      // Collect rewards from selected pools
      const allRewards: Array<{
        market: any;
        poolType: "collateral" | "sail";
        rewardAmount: bigint;
      }> = [];

      // If no pools selected, compound from all pools (backward compatibility)
      const poolsToCompound = selectedPools.length > 0
        ? selectedPools
        : anchorMarkets.flatMap(([id, m]) => {
            const pools: Array<{ marketId: string; poolType: "collateral" | "sail" }> = [];
            if ((m as any).addresses?.stabilityPoolCollateral) {
              pools.push({ marketId: id, poolType: "collateral" });
            }
            if ((m as any).addresses?.stabilityPoolLeveraged) {
              pools.push({ marketId: id, poolType: "sail" });
            }
            return pools;
          });

      anchorMarkets.forEach(([id, m], mi) => {
        const selectedPool = poolsToCompound.find(p => p.marketId === id);
        if (!selectedPool) return;
        
        const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
        const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
        
        let offset = 0;
        for (let i = 0; i < mi; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
          offset += 4;
          if (prevHasCollateral) offset += 3;
          if (prevHasSail) offset += 3;
          if (prevHasPriceOracle) offset += 2;
        }
        
        const baseOffset = offset;
        let currentOffset = baseOffset + 4;
        
        if (hasCollateralPool && selectedPool.poolType === "collateral") {
          const collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
          if (collateralPoolRewards && collateralPoolRewards > 0n) {
            allRewards.push({
              market: m,
              poolType: "collateral",
              rewardAmount: collateralPoolRewards,
            });
          }
          currentOffset += 3;
        }
        
        if (hasSailPool && selectedPool.poolType === "sail") {
          const sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
          if (sailPoolRewards && sailPoolRewards > 0n) {
            allRewards.push({
              market: m,
              poolType: "sail",
              rewardAmount: sailPoolRewards,
            });
          }
        }
      });

      // Process all rewards - compound each one
      for (const reward of allRewards) {
        try {
          await handleCompoundConfirm(
            reward.market,
            reward.poolType,
            reward.rewardAmount
          );
        } catch (e) {
          console.error(`Failed to compound rewards for ${reward.market.id}:`, e);
        }
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([
        refetchReads(),
        refetchUserDeposits(),
      ]);
    } catch (error) {
      console.error("Compound all error:", error);
    } finally {
      setIsCompoundingAll(false);
    }
  };

  const handleBuyTide = async (selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }> = []) => {
    // TODO: Implement Buy $TIDE functionality
    // This would involve swapping rewards for $TIDE tokens
    console.log("Buy $TIDE functionality to be implemented");
    // For now, we'll just claim the rewards first
    // In the future, this should swap rewards for $TIDE
    await handleClaimAll(selectedPools);
  };

  // Individual market claim handlers
  const handleClaimMarketBasicClaim = async () => {
    if (!address || !selectedMarketForClaim || isClaiming) return;
    const market = anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1];
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
      await Promise.all([
        refetchReads(),
        refetchUserDeposits(),
      ]);
    } catch (e) {
      console.error("Failed to claim market rewards:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimMarketCompound = async () => {
    if (!address || !selectedMarketForClaim || isCompounding) return;
    const market = anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1];
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
      console.error("Failed to compound market rewards:", e);
    } finally {
      setIsCompounding(false);
    }
  };

  const handleClaimMarketBuyTide = async () => {
    // TODO: Implement Buy $TIDE functionality for individual market
    console.log("Buy $TIDE functionality to be implemented for market:", selectedMarketForClaim);
    await handleClaimMarketBasicClaim();
  };

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
      <Head>
        <title>Anchor</title>
        <meta name="description" content="Mint and redeem Anchor (pegged) tokens" />
      </Head>

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
                  <h2 className="font-bold text-white text-lg text-center">Mint</h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Mint a pegged token with a supported asset
                </p>
              </div>

              {/* Secure Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ShieldCheckIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">Secure</h2>
              </div>
                <p className="text-sm text-white/80 text-center">
                  Deposit into a stability pool to secure the protocol
                </p>
              </div>

              {/* Earn Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">Earn</h2>
            </div>
                <p className="text-sm text-white/80 text-center">
                  Earn real yield from collateral and trading fees for helping secure the protocol
                </p>
              </div>

              {/* Redeem Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ArrowPathIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">Redeem</h2>
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
            let totalAPRForBar = 0;
            let aprCountForBar = 0;

            if (reads) {
              anchorMarkets.forEach(([id, m], mi) => {
                const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
                const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
                
                let offset = 0;
                for (let i = 0; i < mi; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                  offset += 5; // 4 minter calls + 1 config call
                  if (prevHasCollateral) offset += 4;
                  if (prevHasSail) offset += 4;
                  if (prevHasPriceOracle) offset += 2;
                }
                
                const baseOffset = offset;
                const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
                
                let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
                let collateralPoolRewards: bigint | undefined;
                let sailPoolRewards: bigint | undefined;
                let collateralPoolDeposit: bigint | undefined;
                let sailPoolDeposit: bigint | undefined;
                
                if (hasCollateralPool) {
                  collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                  collateralPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
                  currentOffset += 4;
                }
                
                if (hasSailPool) {
                  sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                  sailPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
                  currentOffset += 4;
                }

                const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
                let collateralPriceDecimals: number | undefined;
                let collateralPrice: bigint | undefined;
                if (hasPriceOracle) {
                  collateralPriceDecimals = reads?.[currentOffset]?.result as number | undefined;
                  const priceRaw = reads?.[currentOffset + 1]?.result as bigint | undefined;
                  collateralPrice = priceRaw;
                }

                const userDeposit = userDepositMap.get(mi) || 0n;

                // Calculate rewards USD
                if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
                  const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                  const collateralAmount = Number(collateralPoolRewards) / 1e18;
                  totalRewardsForBar += collateralAmount * price;
                }
                if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                  const peggedPrice = Number(peggedTokenPrice) / 1e18;
                  const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                  const leveragedAmount = Number(sailPoolRewards) / 1e18;
                  totalRewardsForBar += leveragedAmount * (peggedPrice * collateralPriceNum);
                }

                // Calculate position USD
                if (collateralPoolDeposit && collateralPrice && collateralPriceDecimals !== undefined) {
                  const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                  const depositAmount = Number(collateralPoolDeposit) / 1e18;
                  totalPositionForBar += depositAmount * price;
                }
                if (sailPoolDeposit && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                  const peggedPrice = Number(peggedTokenPrice) / 1e18;
                  const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                  const depositAmount = Number(sailPoolDeposit) / 1e18;
                  totalPositionForBar += depositAmount * (peggedPrice * collateralPriceNum);
                }
                if (userDeposit && userDeposit > 0n && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                  const peggedPrice = Number(peggedTokenPrice) / 1e18;
                  const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                  const depositAmount = Number(userDeposit) / 1e18;
                  totalPositionForBar += depositAmount * (peggedPrice * collateralPriceNum);
                }
              });
            }

            const rewardsPercentage = totalPositionForBar > 0 
              ? Math.min((totalRewardsForBar / totalPositionForBar) * 100, 100)
              : 0;
            const averageAPRForBar = aprCountForBar > 0 ? totalAPRForBar / aprCountForBar : 0;

              return (
                <div className="mb-2">
                  <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                    {/* Rewards Header Box */}
                  <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2">
                      <h2 className="font-bold font-mono text-white text-2xl text-center">
                        Rewards
                      </h2>
                    <InfoTooltip
                      label={
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg mb-2">Ledger Marks</h3>
                            <p className="text-white/90 leading-relaxed">
                              A ledger is both a record of truth and a core DeFi
                              symbol — and a mark is what every sailor leaves behind
                              on a voyage.
              </p>
            </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/90 leading-relaxed mb-2">
                              Each Ledger Mark is proof that you were here early,
                              helping stabilize the first Harbor markets and guide
                              them through calm launch conditions.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                The more you contribute, the deeper your mark on the
                                ledger.
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                When $TIDE surfaces, these marks will convert into
                                your share of rewards and governance power.
                              </p>
            </div>
          </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/80 italic leading-relaxed">
                              Think of them as a record of your journey — every mark,
                              a line in Harbor's logbook.
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
                    <div className="bg-[#17395F] p-3">
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 pl-2">
                        {/* Claimable Value */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-xs text-white/70 mb-1.5 text-center font-medium">
                            Claimable Value
                          </div>
                          <div className="text-lg font-bold text-white font-mono text-center">
                            ${totalRewardsForBar > 0 ? totalRewardsForBar.toFixed(2) : "0.00"}
                          </div>
                        </div>

                        {/* vAPR */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-xs text-white/70 mb-1.5 text-center font-medium">
                            vAPR
                          </div>
                          <div className="text-lg font-bold text-white font-mono text-center">
                            {averageAPRForBar > 0 ? `${averageAPRForBar.toFixed(2)}%` : "-"}
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

                    {/* Ledger Marks Box */}
                    <div className="bg-[#17395F] p-3">
                      <div className="text-xs text-white/70 mb-0.5 text-center">
                        Ledger Marks
                      </div>
                      <div className="text-base font-bold text-white font-mono text-center">
                        {(() => {
                          // Calculate total ledger marks: 1x multiplier per dollar deposited
                          let totalMarks = 0;
                        if (reads) {
                          anchorMarkets.forEach(([id, m], mi) => {
                            const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
                            const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
                            
                            let offset = 0;
                            for (let i = 0; i < mi; i++) {
                              const prevMarket = anchorMarkets[i][1];
                              const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                              const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                              const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                              offset += 5; // 4 minter calls + 1 config call
                              if (prevHasCollateral) offset += 4;
                              if (prevHasSail) offset += 4;
                              if (prevHasPriceOracle) offset += 2;
                            }
                            
                            const baseOffset = offset;
                            const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
                            const collateralPoolDeposit = hasCollateralPool ? (reads?.[baseOffset + 5 + 0]?.result as bigint | undefined) : undefined;
                            const sailPoolDeposit = hasSailPool ? (reads?.[baseOffset + 5 + (hasCollateralPool ? 4 : 0) + 0]?.result as bigint | undefined) : undefined;
                            const haTokenBalance = reads?.[baseOffset + 3]?.result as bigint | undefined;
                            
                            const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
                            const priceOffset = baseOffset + 5 + (hasCollateralPool ? 4 : 0) + (hasSailPool ? 4 : 0);
                            const priceDecimals = hasPriceOracle ? Number((reads?.[priceOffset]?.result as unknown as number) ?? 0) : 18;
                            const priceRaw = hasPriceOracle ? (reads?.[priceOffset + 1]?.result as unknown as bigint | undefined) : undefined;
                            const collateralPriceUSD = priceRaw ? Number(priceRaw) / 10 ** priceDecimals : 1;
                            
                            const collateralPoolDepositUSD = collateralPoolDeposit ? Number(formatEther(collateralPoolDeposit)) * collateralPriceUSD : 0;
                            const sailPoolDepositUSD = sailPoolDeposit ? Number(formatEther(sailPoolDeposit)) * collateralPriceUSD : 0;
                            const haTokenBalanceUSD = haTokenBalance ? Number(formatEther(haTokenBalance)) * collateralPriceUSD : 0;
                            
                            const totalDepositUSD = collateralPoolDepositUSD + sailPoolDepositUSD + haTokenBalanceUSD;
                            totalMarks += totalDepositUSD;
                            });
                          }
                          return totalMarks.toFixed(2);
                        })()}
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
              const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
              
              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                  offset += 5; // 4 minter calls + 1 config call
                  if (prevHasCollateral) offset += 4;
                  if (prevHasSail) offset += 4;
                if (prevHasPriceOracle) offset += 2;
              }
              
              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
              
                let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
              let collateralPoolRewards: bigint | undefined;
              let collateralPoolAPR: { collateral: number; steam: number } | undefined;
              let sailPoolRewards: bigint | undefined;
              let sailPoolAPR: { collateral: number; steam: number } | undefined;
              
              if (hasCollateralPool) {
                const collateralAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
                collateralPoolAPR = collateralAPRResult
                  ? {
                      collateral: Number(collateralAPRResult[0]) / 1e16 * 100,
                      steam: Number(collateralAPRResult[1]) / 1e16 * 100,
                    }
                  : undefined;
                collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                if (collateralPoolAPR) {
                  totalAPR += (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0);
                  aprCount++;
                }
                  currentOffset += 4;
              }
              
              if (hasSailPool) {
                const sailAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
                sailPoolAPR = sailAPRResult
                  ? {
                      collateral: Number(sailAPRResult[0]) / 1e16 * 100,
                      steam: Number(sailAPRResult[1]) / 1e16 * 100,
                    }
                  : undefined;
                sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                if (sailPoolAPR) {
                  totalAPR += (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0);
                  aprCount++;
                }
                  currentOffset += 4;
              }

              // Get price oracle for USD calculations
              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              let collateralPriceDecimals: number | undefined;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                collateralPriceDecimals = reads?.[currentOffset]?.result as number | undefined;
                const priceRaw = reads?.[currentOffset + 1]?.result as bigint | undefined;
                collateralPrice = priceRaw;
              }

              // Calculate USD values
              if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
                totalCollateralRewards += collateralPoolRewards;
                const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const collateralAmount = Number(collateralPoolRewards) / 1e18;
                totalCollateralRewardsUSD += collateralAmount * price;
              }

              if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                totalSailRewards += sailPoolRewards;
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const leveragedAmount = Number(sailPoolRewards) / 1e18;
                totalSailRewardsUSD += leveragedAmount * (peggedPrice * collateralPriceNum);
              }

              // Calculate total deposit USD for earnings calculation
              const userDeposit = userDepositMap.get(mi);
              if (userDeposit && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const depositAmount = Number(userDeposit) / 1e18;
                totalDepositUSD += depositAmount * (peggedPrice * collateralPriceNum);
              }
            });

            const totalRewardsUSD = totalCollateralRewardsUSD + totalSailRewardsUSD;
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
              const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
              const userDeposit = userDepositMap.get(mi) || 0n;
              
              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                offset += 4;
                if (prevHasCollateral) offset += 3;
                if (prevHasSail) offset += 3;
                if (prevHasPriceOracle) offset += 2;
              }
              
              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
              
              let currentOffset = baseOffset + 4;
              let collateralPoolRewards: bigint | undefined;
              let sailPoolRewards: bigint | undefined;
              
              if (hasCollateralPool) {
                collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                currentOffset += 3;
              }
              
              if (hasSailPool) {
                sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                currentOffset += 3;
              }

              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              let collateralPriceDecimals: number | undefined;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                collateralPriceDecimals = reads?.[currentOffset]?.result as number | undefined;
                const priceRaw = reads?.[currentOffset + 1]?.result as bigint | undefined;
                collateralPrice = priceRaw;
              }

              let collateralRewardsUSD = 0;
              let sailRewardsUSD = 0;

              if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
                const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const collateralAmount = Number(collateralPoolRewards) / 1e18;
                collateralRewardsUSD = collateralAmount * price;
              }

              if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const leveragedAmount = Number(sailPoolRewards) / 1e18;
                sailRewardsUSD = leveragedAmount * (peggedPrice * collateralPriceNum);
              }

              const totalMarketRewardsUSD = collateralRewardsUSD + sailRewardsUSD;
              
              // Calculate user deposit USD for sorting
              let userDepositUSD = 0;
              if (userDeposit && userDeposit > 0n && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const depositAmount = Number(userDeposit) / 1e18;
                userDepositUSD = depositAmount * (peggedPrice * collateralPriceNum);
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
            const sortedMarketsWithRewards = [...marketsWithRewards].sort((a, b) => b.userDepositUSD - a.userDepositUSD);

            return (
              <>
                    {/* Expanded View */}
                    {isEarningsExpanded && marketsWithRewards.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#1E4775]/20 space-y-2">
                        {marketsWithRewards
                          .filter(({ collateralRewards, sailRewards, collateralRewardsUSD, sailRewardsUSD }) => {
                            const totalMarketRewardsUSD = collateralRewardsUSD + sailRewardsUSD;
                            return totalMarketRewardsUSD > 0 || (collateralRewards && collateralRewards > 0n) || (sailRewards && sailRewards > 0n);
                          })
                          .map(({ market, marketId, collateralRewards, collateralRewardsUSD, sailRewards, sailRewardsUSD, collateralSymbol, sailSymbol }) => {
                            const marketTotalUSD = collateralRewardsUSD + sailRewardsUSD;
                            const hasCollateral = collateralRewards > 0n;
                            const hasSail = sailRewards > 0n;
                            
                            return (
                              <div key={marketId} className="flex items-center justify-between text-xs">
                                <div className="flex-1">
                                  <div className="text-[#1E4775] font-medium">{market.peggedToken?.symbol || marketId}</div>
                                  <div className="text-[#1E4775]/70">
                                    ${marketTotalUSD.toFixed(2)}
                                    {hasCollateral && (
                                      <span className="ml-2">
                                        {formatToken(collateralRewards)} {collateralSymbol}
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
                          })}
                      </div>
                )}
              </>
            );
          })()}

          {/* Markets List */}
          <section className="space-y-2 overflow-visible">
            {/* Header Row */}
              <div className="bg-white p-3 overflow-x-auto">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
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
                const groups: Record<string, Array<{
                  marketId: string;
                  market: any;
                  marketIndex: number;
                }>> = {};

                anchorMarkets.forEach(([id, m], mi) => {
                  const symbol = m.peggedToken?.symbol || "UNKNOWN";
                  if (!groups[symbol]) {
                    groups[symbol] = [];
                  }
                  groups[symbol].push({ marketId: id, market: m, marketIndex: mi });
                });

                // Process each group
                return Object.entries(groups).map(([symbol, marketList]) => {
                  // Collect all data for markets in this group
                  const marketsData = marketList.map(({ marketId, market, marketIndex: mi }) => {
                    const hasCollateralPool = !!(market as any).addresses?.stabilityPoolCollateral;
                    const hasSailPool = !!(market as any).addresses?.stabilityPoolLeveraged;
                    
                    // Calculate offset
              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                      offset += 5; // 4 minter calls + 1 config call
                      if (prevHasCollateral) offset += 4;
                      if (prevHasSail) offset += 4;
                      if (prevHasPriceOracle) offset += 2;
              }
              
              const baseOffset = offset;
                    const collateralRatio = reads?.[baseOffset]?.result as bigint | undefined;
                    const collateralValue = reads?.[baseOffset + 1]?.result as bigint | undefined;
                    const totalDebt = reads?.[baseOffset + 2]?.result as bigint | undefined;
                    const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
                    const minterConfig = reads?.[baseOffset + 4]?.result as any | undefined;
                    
                    // Extract min collateral ratio from config
                    let minCollateralRatio: bigint | undefined;
                    if (minterConfig?.mintPeggedIncentiveConfig?.collateralRatioBandUpperBounds) {
                      const bands = minterConfig.mintPeggedIncentiveConfig.collateralRatioBandUpperBounds;
                      if (Array.isArray(bands) && bands.length > 0) {
                        minCollateralRatio = bands[0] as bigint;
                      }
                    }
              
              let collateralPoolTVL: bigint | undefined;
              let collateralPoolAPR: { collateral: number; steam: number } | undefined;
              let collateralPoolRewards: bigint | undefined;
              let collateralPoolDeposit: bigint | undefined;
              let sailPoolTVL: bigint | undefined;
              let sailPoolAPR: { collateral: number; steam: number } | undefined;
              let sailPoolRewards: bigint | undefined;
              let sailPoolDeposit: bigint | undefined;
              
              let currentOffset = baseOffset + 4;
              
              if (hasCollateralPool) {
                collateralPoolTVL = reads?.[currentOffset]?.result as bigint | undefined;
                const collateralAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
                collateralPoolAPR = collateralAPRResult
                  ? {
                      collateral: Number(collateralAPRResult[0]) / 1e16 * 100,
                      steam: Number(collateralAPRResult[1]) / 1e16 * 100,
                    }
                  : undefined;
                collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                collateralPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
                currentOffset += 4;
              }
              
              if (hasSailPool) {
                sailPoolTVL = reads?.[currentOffset]?.result as bigint | undefined;
                const sailAPRResult = reads?.[currentOffset + 1]?.result as [bigint, bigint] | undefined;
                sailPoolAPR = sailAPRResult
                  ? {
                      collateral: Number(sailAPRResult[0]) / 1e16 * 100,
                      steam: Number(sailAPRResult[1]) / 1e16 * 100,
                    }
                  : undefined;
                sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                sailPoolDeposit = reads?.[currentOffset + 3]?.result as bigint | undefined;
                currentOffset += 4;
              }

                    const hasPriceOracle = !!(market as any).addresses?.collateralPrice;
              let collateralPriceDecimals: number | undefined;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                collateralPriceDecimals = reads?.[currentOffset]?.result as number | undefined;
                const priceRaw = reads?.[currentOffset + 1]?.result as bigint | undefined;
                collateralPrice = priceRaw;
              }

              const userDeposit = userDepositMap.get(mi) || 0n;

                    // Calculate USD values
              let collateralPoolDepositUSD = 0;
              let sailPoolDepositUSD = 0;
              let haTokenBalanceUSD = 0;
                    let collateralRewardsUSD = 0;
                    let sailRewardsUSD = 0;

              if (collateralPoolDeposit && collateralPrice && collateralPriceDecimals !== undefined) {
                const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const depositAmount = Number(collateralPoolDeposit) / 1e18;
                collateralPoolDepositUSD = depositAmount * price;
              }

              if (sailPoolDeposit && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const depositAmount = Number(sailPoolDeposit) / 1e18;
                sailPoolDepositUSD = depositAmount * (peggedPrice * collateralPriceNum);
              }

              if (userDeposit && userDeposit > 0n && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                const depositAmount = Number(userDeposit) / 1e18;
                haTokenBalanceUSD = depositAmount * (peggedPrice * collateralPriceNum);
              }

                    if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
                      const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                      const collateralAmount = Number(collateralPoolRewards) / 1e18;
                      collateralRewardsUSD = collateralAmount * price;
                    }

                    if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                      const peggedPrice = Number(peggedTokenPrice) / 1e18;
                      const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                      const leveragedAmount = Number(sailPoolRewards) / 1e18;
                      sailRewardsUSD = leveragedAmount * (peggedPrice * collateralPriceNum);
                    }

                    const collateralTotalAPR = collateralPoolAPR
                      ? (collateralPoolAPR.collateral || 0) + (collateralPoolAPR.steam || 0)
                      : 0;
                    const sailTotalAPR = sailPoolAPR
                      ? (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0)
                      : 0;
                    const maxAPR = Math.max(collateralTotalAPR, sailTotalAPR);

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
                      collateralPoolDeposit,
                      collateralPoolDepositUSD,
                      sailPoolTVL,
                      sailPoolAPR,
                      sailPoolRewards,
                      sailPoolDeposit,
                      sailPoolDepositUSD,
                      haTokenBalanceUSD,
                      collateralRewardsUSD,
                      sailRewardsUSD,
                      collateralPrice,
                      collateralPriceDecimals,
                      userDeposit,
                      maxAPR,
                      minterAddress: (market as any).addresses?.minter,
                      minCollateralRatio,
                    };
                  });

                  // Calculate combined values
                  const combinedPositionUSD = marketsData.reduce((sum, m) => 
                    sum + m.collateralPoolDepositUSD + m.sailPoolDepositUSD + m.haTokenBalanceUSD, 0
                  );
                  const combinedRewardsUSD = marketsData.reduce((sum, m) => 
                    sum + m.collateralRewardsUSD + m.sailRewardsUSD, 0
                  );
                  const maxAPR = Math.max(...marketsData.map(m => m.maxAPR), 0);

                  // Collect all unique deposit assets
                  const assetMap = new Map<string, { symbol: string; name: string }>();
                  marketList.forEach(({ market }) => {
                    const collateralSymbol = market?.collateral?.symbol || "";
                    const assets = getAcceptedDepositAssets(collateralSymbol);
                    assets.forEach(asset => {
                      if (!assetMap.has(asset.symbol)) {
                        assetMap.set(asset.symbol, asset);
                      }
                    });
                  });
                  const allDepositAssets = Array.from(assetMap.values());

                  // Collect all unique reward tokens from all markets
                  const rewardTokenMap = new Map<string, string>();
                  marketList.forEach(({ market }) => {
                    // Add default reward tokens (collaterals)
                    const collateralSymbol = market?.collateral?.symbol || "";
                    if (collateralSymbol && !rewardTokenMap.has(collateralSymbol)) {
                      rewardTokenMap.set(collateralSymbol, collateralSymbol);
                    }
                    // Add reward tokens from config (default + additional)
                    const rewardTokens = (market as any)?.rewardTokens;
                    if (rewardTokens) {
                      const defaultRewards = rewardTokens.default || [];
                      const additionalRewards = rewardTokens.additional || [];
                      [...defaultRewards, ...additionalRewards].forEach((token: string) => {
                        if (token && !rewardTokenMap.has(token)) {
                          rewardTokenMap.set(token, token);
                        }
                      });
                    }
                  });
                  const allRewardTokens = Array.from(rewardTokenMap.values());
                  
                  // Debug: log reward tokens for haBTC
                  if (symbol === "haBTC") {
                    console.log("haBTC reward tokens:", allRewardTokens, "from markets:", marketList.map(m => ({ 
                      id: m.marketId, 
                      collateral: m.market?.collateral?.symbol,
                      rewardTokens: (m.market as any)?.rewardTokens 
                    })));
                  }

                  const isExpanded = expandedMarket === symbol;

              return (
                    <React.Fragment key={symbol}>
                  <div
                    className={`p-3 overflow-x-auto transition cursor-pointer ${
                      isExpanded
                        ? "bg-[#B8EBD5]"
                        : "bg-white hover:bg-[#B8EBD5]"
                    }`}
                        onClick={() => setExpandedMarket(isExpanded ? null : symbol)}
                  >
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                      <div className="whitespace-nowrap min-w-0 overflow-hidden">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[#1E4775] font-medium">
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
                            {allDepositAssets.map((asset) => (
                            <SimpleTooltip
                              key={asset.symbol}
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    {asset.name}
                                  </div>
                                  <div className="text-xs opacity-90">
                                      All assets are converted to the market's collateral token on deposit
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
                            ))}
                      </div>
                      <div 
                        className="text-center min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                            <span className="text-[#1E4775] font-medium text-xs font-mono">
                              {maxAPR > 0 ? `up to ${formatAPR(maxAPR)}` : "-"}
                            </span>
                      </div>
                      <div
                        className="text-center min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                            <div className="text-[#1E4775] font-bold text-sm font-mono">
                              {combinedRewardsUSD > 0 ? `$${combinedRewardsUSD.toFixed(2)}` : "-"}
                            </div>
                      </div>
                      <div
                        className="text-center min-w-0 flex items-center justify-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                            {allRewardTokens.length > 0 ? (
                              <div className="flex items-center" style={{ gap: allRewardTokens.length > 1 ? '-4px' : '4px' }}>
                                {allRewardTokens.map((token, idx) => (
                                  <SimpleTooltip key={token} label={token}>
                                  <Image
                                      src={getLogoPath(token)}
                                      alt={token}
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0 cursor-help rounded-full border border-white"
                                      style={{ 
                                        zIndex: allRewardTokens.length - idx,
                                        position: 'relative'
                                      }}
                                  />
                                </SimpleTooltip>
                                ))}
                                {/* Ledger Marks Multiplier Logo */}
                                <SimpleTooltip label="1 ledger mark per dollar per day">
                                  <div className="relative flex-shrink-0" style={{ marginLeft: '4px', zIndex: allRewardTokens.length + 1 }}>
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
                      <div className="text-center min-w-0">
                        <span className="text-[#1E4775] font-medium text-xs font-mono">
                              {combinedPositionUSD > 0 ? `$${(combinedPositionUSD + combinedRewardsUSD).toFixed(2)}` : "-"}
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
                              initialTab: "mint",
                              simpleMode: true,
                              bestPoolType: "collateral",
                              allMarkets: marketList.map(m => ({
                                marketId: m.marketId,
                                market: m.market,
                              })),
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                          >
                            Deposit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            // Check if user has positions to determine initial tab
                            const hasPositions = combinedPositionUSD > 0;
                              setManageModal({
                              marketId: marketList[0].marketId,
                              market: marketList[0].market,
                              initialTab: hasPositions ? "withdraw" : "redeem",
                              simpleMode: true,
                              bestPoolType: "collateral",
                              allMarkets: marketList.map(m => ({
                                marketId: m.marketId,
                                market: m.market,
                              })),
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-full whitespace-nowrap"
                          >
                            Withdraw
                          </button>
                      </div>
                    </div>
                  </div>

                      {/* Expanded View - Show all markets in group */}
                  {isExpanded && (
                        <div className="bg-[#B8EBD5] p-2 border-t border-white/20">
                          {marketsData.map((marketData) => {
                            const volatilityRisk = calculateVolatilityRisk(
                              marketData.collateralValue,
                              marketData.totalDebt,
                              marketData.collateralPoolTVL,
                              marketData.sailPoolTVL,
                              marketData.peggedTokenPrice
                            );

                            // Format min collateral ratio
                            const minCollateralRatioFormatted = marketData.minCollateralRatio
                              ? `${(Number(marketData.minCollateralRatio) / 1e16).toFixed(2)}%`
                              : "-";

                            return (
                              <div key={marketData.marketId} className="bg-white p-2 mb-2 rounded border border-[#1E4775]/10">
                                <h3 className="text-base font-bold text-[#1E4775] mb-2">
                                  {marketData.market.name || marketData.marketId}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                                  <div className="bg-[#1E4775]/5 p-1.5 rounded">
                                    <div className="text-[10px] text-[#1E4775]/70 mb-0.5">Collateral</div>
                                    <div className="text-xs font-semibold text-[#1E4775]">
                                      {marketData.market.collateral?.symbol || "ETH"}
                                    </div>
                                  </div>
                                  <div className="bg-[#1E4775]/5 p-1.5 rounded">
                                    <div className="text-[10px] text-[#1E4775]/70 mb-0.5">Min Collateral Ratio</div>
                                    <div className="text-xs font-semibold text-[#1E4775]">
                                      {minCollateralRatioFormatted}
                                    </div>
                                  </div>
                                  <div className="bg-[#1E4775]/5 p-1.5 rounded">
                                    <div className="text-[10px] text-[#1E4775]/70 mb-0.5">Current Collateral Ratio</div>
                                    <div className="text-xs font-semibold text-[#1E4775]">
                                      {formatRatio(marketData.collateralRatio)}
                                    </div>
                                  </div>
                                  <div className="bg-[#1E4775]/5 p-1.5 rounded">
                                    <div className="text-[10px] text-[#1E4775]/70 mb-0.5">Volatility Risk</div>
                                    <div className="text-xs font-semibold text-[#1E4775]">
                                      {volatilityRisk}
                                    </div>
                                  </div>
                          <button
                                    onClick={() => setContractAddressesModal({
                                      marketId: marketData.marketId,
                                      market: marketData.market,
                                      minterAddress: marketData.minterAddress,
                                    })}
                                    className="bg-[#1E4775]/10 hover:bg-[#1E4775]/20 text-[#1E4775] text-xs font-medium py-1.5 px-2 rounded transition-colors flex items-center justify-center gap-1 h-full"
                                  >
                                    <span>Contract Addresses</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                          </button>
                      </div>
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
              await Promise.all([
                refetchReads(),
                refetchUserDeposits(),
              ]);
              setManageModal(null);
            }}
          />
        )}

        {compoundModal && (
          <AnchorCompoundModal
            isOpen={!!compoundModal}
            onClose={() => setCompoundModal(null)}
            poolType={compoundModal.poolType}
            rewardAmount={compoundModal.rewardAmount}
            rewardTokenSymbol={compoundModal.poolType === "collateral" 
              ? (compoundModal.market.collateral?.symbol || "ETH")
              : (compoundModal.market.leveragedToken?.symbol || "hs")}
            expectedPeggedOutput={0n} // TODO: Calculate expected output
            peggedTokenSymbol={compoundModal.market.peggedToken?.symbol || "ha"}
            fees={[]} // TODO: Calculate fees
            onConfirm={async () => {
              await handleCompoundConfirm(compoundModal.market, compoundModal.poolType, compoundModal.rewardAmount);
              setCompoundModal(null);
            }}
            isLoading={isCompounding}
          />
        )}

        <AnchorClaimAllModal
          isOpen={isClaimAllModalOpen}
          onClose={() => setIsClaimAllModalOpen(false)}
          onBasicClaim={handleClaimAll}
          onCompound={handleCompoundAll}
          onBuyTide={handleBuyTide}
          positions={(() => {
            // Build positions array from marketsWithRewards
            const positions: Array<{
              marketId: string;
              market: any;
              poolType: "collateral" | "sail";
              rewards: bigint;
              rewardsUSD: number;
              deposit: bigint;
              depositUSD: number;
            }> = [];
            
            if (reads && anchorMarkets) {
              anchorMarkets.forEach(([id, m], mi) => {
                const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
                const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
                
                // Calculate offset for this market
                let offset = 0;
                for (let i = 0; i < mi; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses?.collateralPrice;
                  offset += 4;
                  if (prevHasCollateral) offset += 3;
                  if (prevHasSail) offset += 3;
                  if (prevHasPriceOracle) offset += 2;
                }
                
                const baseOffset = offset;
                const peggedTokenPrice = reads?.[baseOffset + 3]?.result as bigint | undefined;
                let currentOffset = baseOffset + 4;
                
                // Get price oracle for USD calculations
                const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
                let collateralPriceDecimals: number | undefined;
                let collateralPrice: bigint | undefined;
                let priceOffset = currentOffset;
                if (hasCollateralPool) priceOffset += 3;
                if (hasSailPool) priceOffset += 3;
                if (hasPriceOracle) {
                  collateralPriceDecimals = reads?.[priceOffset]?.result as number | undefined;
                  const priceRaw = reads?.[priceOffset + 1]?.result as bigint | undefined;
                  collateralPrice = priceRaw;
                }
                
                // Collateral pool position
                if (hasCollateralPool) {
                  const collateralPoolDeposit = reads?.[currentOffset]?.result as bigint | undefined;
                  const collateralPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                  
                  let depositUSD = 0;
                  let rewardsUSD = 0;
                  
                  if (collateralPoolDeposit && collateralPrice && collateralPriceDecimals !== undefined) {
                    const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                    const depositAmount = Number(collateralPoolDeposit) / 1e18;
                    depositUSD = depositAmount * price;
                  }
                  
                  if (collateralPoolRewards && collateralPrice && collateralPriceDecimals !== undefined) {
                    const price = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                    const rewardsAmount = Number(collateralPoolRewards) / 1e18;
                    rewardsUSD = rewardsAmount * price;
                  }
                  
                  // Only include if there are rewards
                  if (collateralPoolRewards && collateralPoolRewards > 0n) {
                    positions.push({
                      marketId: id,
                      market: m,
                      poolType: "collateral",
                      rewards: collateralPoolRewards,
                      rewardsUSD,
                      deposit: collateralPoolDeposit || 0n,
                      depositUSD,
                    });
                  }
                  
                  currentOffset += 3;
                }
                
                // Sail pool position
                if (hasSailPool) {
                  const sailPoolDeposit = reads?.[currentOffset]?.result as bigint | undefined;
                  const sailPoolRewards = reads?.[currentOffset + 2]?.result as bigint | undefined;
                  
                  let depositUSD = 0;
                  let rewardsUSD = 0;
                  
                  if (sailPoolDeposit && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                    const peggedPrice = Number(peggedTokenPrice) / 1e18;
                    const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                    const depositAmount = Number(sailPoolDeposit) / 1e18;
                    depositUSD = depositAmount * (peggedPrice * collateralPriceNum);
                  }
                  
                  if (sailPoolRewards && peggedTokenPrice && collateralPrice && collateralPriceDecimals !== undefined) {
                    const peggedPrice = Number(peggedTokenPrice) / 1e18;
                    const collateralPriceNum = Number(collateralPrice) / (10 ** (collateralPriceDecimals || 8));
                    const rewardsAmount = Number(sailPoolRewards) / 1e18;
                    rewardsUSD = rewardsAmount * (peggedPrice * collateralPriceNum);
                  }
                  
                  // Only include if there are rewards
                  if (sailPoolRewards && sailPoolRewards > 0n) {
                    positions.push({
                      marketId: id,
                      market: m,
                      poolType: "sail",
                      rewards: sailPoolRewards,
                      rewardsUSD,
                      deposit: sailPoolDeposit || 0n,
                      depositUSD,
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
            marketSymbol={anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1]?.peggedToken?.symbol || "Market"}
            isLoading={isClaiming || isCompounding}
          />
        )}

        {/* Contract Addresses Modal */}
        {contractAddressesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setContractAddressesModal(null)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
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
                  <EtherscanLink label="" address={contractAddressesModal.minterAddress} />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Collateral Pool</div>
                  <EtherscanLink 
                    label="" 
                    address={(contractAddressesModal.market as any).addresses?.stabilityPoolCollateral} 
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Sail Pool</div>
                  <EtherscanLink 
                    label="" 
                    address={(contractAddressesModal.market as any).addresses?.stabilityPoolLeveraged} 
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">ha Token</div>
                  <EtherscanLink 
                    label="" 
                    address={(contractAddressesModal.market as any).addresses?.peggedToken} 
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Collateral Token</div>
                  <EtherscanLink 
                    label="" 
                    address={(contractAddressesModal.market as any).addresses?.collateralToken} 
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Price Oracle</div>
                  <EtherscanLink 
                    label="" 
                    address={(contractAddressesModal.market as any).addresses?.collateralPrice} 
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
