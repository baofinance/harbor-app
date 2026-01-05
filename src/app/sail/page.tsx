"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { useAccount, useContractReads, useContractRead } from "wagmi";
import { formatEther } from "viem";
import { markets } from "@/config/markets";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  GiftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  StarIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import PriceChart from "@/components/PriceChart";
import InfoTooltip from "@/components/InfoTooltip";
import SimpleTooltip from "@/components/SimpleTooltip";
import { getLogoPath } from "@/components/shared";
import { SailManageModal } from "@/components/SailManageModal";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import { useMarketBoostWindows } from "@/hooks/useMarketBoostWindows";
import { MarksBoostBadge } from "@/components/MarksBoostBadge";

// PnL is now fetched from subgraph (useSailPositionPnL hook)

interface PnLData {
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  isLoading: boolean;
  error?: string;
}

const minterABI = [
  {
    inputs: [],
    name: "leverageRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "leveragedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
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

// ERC20 metadata ABI for name(), symbol(), and totalSupply()
const erc20MetadataABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// IWrappedPriceOracle ABI - returns prices in 18 decimals
// latestAnswer() returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
// getPrice() returns fxSAVE price in ETH (for fxUSD markets)
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
  {
    inputs: [],
    name: "getPrice",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Format USD value
function formatUSD(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "-";
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function formatLeverage(value: bigint | undefined): string {
  if (!value) return "-";
  const leverage = Number(value) / 1e18;
  return `${leverage.toFixed(2)}x`;
}

// Parse the"long" side from token name (fetched from contract)
// e.g.,"Harbor Short USD versus stETH" ->"USD"
// e.g.,"Harbor Short stETH versus USD" ->"stETH" (the part after"Short")
function parseLongSide(tokenName: string | undefined, market: any): string {
  if (tokenName) {
    // Token name format:"Harbor Short X versus Y"
    // The"long" side is what we're SHORT against, so it's X (the asset after"Short")
    // Actually, if it says"Short USD versus stETH", we're shorting USD, so we're LONG stETH
    // So the LONG side is Y (after"versus")
    const versusMatch = tokenName.match(/versus\s+(\w+)/i);
    if (versusMatch) return versusMatch[1];

    // Fallback: try other patterns
    const longMatch = tokenName.match(/Long\s+(\w+)/i);
    if (longMatch) return longMatch[1];
  }

  // Fallback: parse from symbol like"hsUSD-stETH"
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

// Parse the"short" side from token name (fetched from contract)
// e.g.,"Harbor Short USD versus stETH" ->"USD"
function parseShortSide(tokenName: string | undefined, market: any): string {
  if (tokenName) {
    // Token name format:"Harbor Short X versus Y"
    // The"short" side is X (what comes after"Short")
    const shortMatch = tokenName.match(/Short\s+(\w+)/i);
    if (shortMatch) return shortMatch[1];
  }

  // Fallback: parse from symbol like"hsUSD-stETH" -> the second part
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

// Extract the"long" side from market config (for grouping)
// This uses the config data, not fetched name
function getLongSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  const match = desc.match(/Long\s+(\w+)/i);
  if (match) return match[1];

  // Check if we can get it from the name stored in config
  const name = market.leveragedToken?.name || "";
  const versusMatch = name.match(/versus\s+(\w+)/i);
  if (versusMatch) return versusMatch[1];

  // Fallback: parse from symbol like"hsUSD-stETH" ->"USD"
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

// Extract the"short" side from market config (for display when contract data isn't loaded)
function getShortSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  // First try to find explicit"short" mention
  const shortMatch = desc.match(/short\s+(\w+)/i);
  if (shortMatch) return shortMatch[1];

  // Check if we can get it from the name stored in config
  const name = market.leveragedToken?.name || "";
  const nameShortMatch = name.match(/Short\s+(\w+)/i);
  if (nameShortMatch) return nameShortMatch[1];

  // Otherwise, if it's"Long X vs Y", Y is the short side
  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
  if (longMatch) return longMatch[1];

  // Fallback: parse from symbol like"hsUSD-stETH" ->"stETH"
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

// Format PnL for display
function formatPnL(value: number): { text: string; color: string } {
  const isPositive = value >= 0;
  const text = `${isPositive ? "+" : ""}$${Math.abs(value).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
  const color = isPositive ? "text-green-600" : "text-red-600";
  return { text, color };
}

// Individual market row component that can use hooks for PnL
function SailMarketRow({
  id,
  market,
  baseOffset,
  hasOracle,
  hasToken,
  reads,
  userDeposit,
  isExpanded,
  onToggleExpand,
  onManageClick,
  isConnected,
  tokenPrices,
}: {
  id: string;
  market: any;
  baseOffset: number;
  hasOracle: boolean;
  hasToken: boolean;
  reads: any;
  userDeposit: bigint | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onManageClick: () => void;
  isConnected: boolean;
  tokenPrices?: {
    peggedBackingRatio: number;
    peggedPriceUSD: number;
    leveragedPriceUSD: number;
    pegTargetUSD: number;
    isDepegged: boolean;
    isLoading: boolean;
    error: boolean;
  };
}) {
  const { address } = useAccount();

  // Parse contract reads using dynamic offsets
  // Offsets: 0-3 = minter reads, 4 = oracle (if exists), 5-6 = token reads (if exists)
  const leverageRatio = reads?.[baseOffset]?.result as bigint | undefined;
  const leveragedTokenPrice = reads?.[baseOffset + 1]?.result as
    | bigint
    | undefined;
  const collateralRatio = reads?.[baseOffset + 2]?.result as bigint | undefined;
  const collateralValue = reads?.[baseOffset + 3]?.result as bigint | undefined;

  // Parse oracle price (at offset 4 if oracle exists)
  let oracleOffset = 4;
  let collateralPriceUSD: bigint | undefined;
  let wrappedRate: bigint | undefined;
  let fxSAVEPriceInETH: bigint | undefined;
  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  // For fxUSD markets, read fxSAVE price directly from the oracle (getPrice()) as a reliable fallback.
  // This avoids relying on the large batched reads array offsets for getPrice().
  const priceOracleAddress = (market as any).addresses?.collateralPrice as
    | `0x${string}`
    | undefined;
  const { data: fxSAVEPriceInETHDirect } = useContractRead({
    address: priceOracleAddress,
    abi: wrappedPriceOracleABI,
    functionName: "getPrice",
    query: {
      enabled: isFxUSDMarket && !!priceOracleAddress,
    },
  });

  if (hasOracle) {
    const oracleRead = reads?.[baseOffset + oracleOffset];
    const oracleResult = oracleRead?.result;

    if (oracleResult !== undefined && oracleResult !== null) {
      if (Array.isArray(oracleResult)) {
        // latestAnswer returns [minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate]
        collateralPriceUSD = oracleResult[1] as bigint;
        wrappedRate = oracleResult[3] as bigint;
      } else if (typeof oracleResult === "object") {
        const obj = oracleResult as {
          maxUnderlyingPrice?: bigint;
          maxWrappedRate?: bigint;
        };
        collateralPriceUSD = obj.maxUnderlyingPrice;
        wrappedRate = obj.maxWrappedRate;
      } else if (typeof oracleResult === "bigint") {
        collateralPriceUSD = oracleResult;
        wrappedRate = BigInt("1000000000000000000");
      }
    }

    // For fxUSD markets, also read getPrice() to get fxSAVE price in ETH
    if (isFxUSDMarket) {
      const getPriceRead = reads?.[baseOffset + oracleOffset + 1];
      if (getPriceRead?.result !== undefined && getPriceRead?.result !== null) {
        fxSAVEPriceInETH = getPriceRead.result as bigint;
      }
    }
  }

  // If the batched read didn't include getPrice(), fall back to the dedicated read.
  if (!fxSAVEPriceInETH && typeof fxSAVEPriceInETHDirect === "bigint") {
    fxSAVEPriceInETH = fxSAVEPriceInETHDirect;
  }

  // Get token name and total supply (after oracle if it exists, +1 if fxUSD market for getPrice)
  const tokenOffset = hasOracle ? (isFxUSDMarket ? 6 : 5) : 4;
  const tokenName = hasToken
    ? (reads?.[baseOffset + tokenOffset]?.result as string | undefined)
    : undefined;
  const totalSupply = hasToken
    ? (reads?.[baseOffset + tokenOffset + 1]?.result as bigint | undefined)
    : undefined;
  const shortSide = parseShortSide(tokenName, market);

  // Calculate current value in USD using token price from hook
  let currentValueUSD: number | undefined;
  if (userDeposit && tokenPrices && tokenPrices.leveragedPriceUSD > 0) {
    const balanceNum = Number(userDeposit) / 1e18;
    currentValueUSD = balanceNum * tokenPrices.leveragedPriceUSD;
  }

  // Get leveraged token address for PnL
  const leveragedTokenAddress = market.addresses?.leveragedToken as
    | `0x${string}`
    | undefined;

  // Calculate PnL from subgraph - uses pre-computed cost basis
  const pnlSubgraph = useSailPositionPnL({
    tokenAddress: leveragedTokenAddress || "",
    minterAddress: (market as any).addresses?.minter as
      | `0x${string}`
      | undefined,
    startBlock: (market as any).startBlock as number | undefined,
    genesisAddress: (market as any).addresses?.genesis as
      | `0x${string}`
      | undefined,
    genesisLeveragedRatio: (market as any)?.genesis?.tokenDistribution
      ?.leveraged?.ratio as number | undefined,
    pegTarget: (market as any)?.pegTarget as "ETH" | "BTC" | undefined,
    debug: process.env.NODE_ENV === "development",
    currentTokenPrice: tokenPrices?.leveragedPriceUSD,
    enabled: !!leveragedTokenAddress && !!userDeposit && userDeposit > 0n,
  });

  // Map subgraph data to PnLData format for compatibility
  const rawPnlError = pnlSubgraph.error as unknown;
  const pnlError =
    rawPnlError && typeof rawPnlError === "object" && "message" in rawPnlError
      ? String((rawPnlError as any).message)
      : rawPnlError
      ? String(rawPnlError)
      : undefined;

  const pnlData: PnLData = {
    costBasis: pnlSubgraph.position?.totalCostBasisUSD ?? 0,
    unrealizedPnL: pnlSubgraph.unrealizedPnL ?? 0,
    unrealizedPnLPercent: pnlSubgraph.unrealizedPnLPercent ?? 0,
    realizedPnL: pnlSubgraph.position?.realizedPnLUSD ?? 0,
    isLoading: pnlSubgraph.isLoading,
    error: pnlError,
  };

  const pnlFormatted =
    pnlData.unrealizedPnL !== 0 ? formatPnL(pnlData.unrealizedPnL) : null;

  return (
    <div key={id}>
      <div
        className={`p-3 overflow-x-auto transition cursor-pointer ${
          isExpanded
            ? "bg-[rgb(var(--surface-selected-rgb))]"
            : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
        }`}
        onClick={onToggleExpand}
      >
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
          <div className="whitespace-nowrap min-w-0 overflow-hidden">
            <div className="flex items-center justify-center gap-1.5">
              <SimpleTooltip label={market.leveragedToken.symbol}>
                <Image
                  src={getLogoPath(market.leveragedToken.symbol)}
                  alt={market.leveragedToken.symbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0 cursor-help"
                />
              </SimpleTooltip>
              <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                Short {shortSide}
              </span>
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
              )}
            </div>
          </div>
          <div className="text-center min-w-0">
            <span className="text-[#1E4775] font-medium text-xs font-mono">
              {formatLeverage(leverageRatio)}
            </span>
          </div>
          <div className="text-center min-w-0">
            <span className="text-[#1E4775] font-medium text-xs font-mono">
              {userDeposit
                ? `${formatToken(userDeposit)} ${
                    market.leveragedToken?.symbol || ""
                  }`
                : "-"}
            </span>
          </div>
          <div className="text-center min-w-0">
            <div className="text-[#1E4775] font-medium text-xs font-mono">
              {userDeposit && currentValueUSD !== undefined
                ? formatUSD(currentValueUSD)
                : "-"}
            </div>
            {userDeposit && pnlFormatted && !pnlData.isLoading && (
              <div className={`text-[10px] font-mono ${pnlFormatted.color}`}>
                {pnlFormatted.text} (
                {pnlData.unrealizedPnLPercent >= 0 ? "+" : ""}
                {pnlData.unrealizedPnLPercent.toFixed(1)}%)
              </div>
            )}
          </div>
          <div
            className="text-center min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageClick();
              }}
              disabled={!isConnected}
              className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <SailMarketExpandedView
          marketId={id}
          market={market}
          leverageRatio={leverageRatio}
          leveragedTokenPrice={leveragedTokenPrice}
          collateralRatio={collateralRatio}
          collateralValue={collateralValue}
          totalSupply={totalSupply}
          collateralPriceUSD={collateralPriceUSD}
          wrappedRate={wrappedRate}
          fxSAVEPriceInETH={fxSAVEPriceInETH}
          pnlData={pnlData}
          currentValueUSD={currentValueUSD}
          userDeposit={userDeposit}
          tokenPrices={tokenPrices}
        />
      )}
    </div>
  );
}

function SailMarketExpandedView({
  marketId,
  market,
  leverageRatio,
  leveragedTokenPrice,
  collateralRatio,
  collateralValue,
  totalSupply,
  collateralPriceUSD,
  wrappedRate,
  fxSAVEPriceInETH,
  pnlData,
  currentValueUSD,
  userDeposit,
  tokenPrices,
}: {
  marketId: string;
  market: any;
  leverageRatio: bigint | undefined;
  leveragedTokenPrice: bigint | undefined;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
  totalSupply: bigint | undefined;
  collateralPriceUSD: bigint | undefined;
  wrappedRate: bigint | undefined;
  fxSAVEPriceInETH?: bigint;
  pnlData?: PnLData;
  currentValueUSD?: number;
  userDeposit?: bigint;
  tokenPrices?: {
    peggedBackingRatio: number;
    peggedPriceUSD: number;
    leveragedPriceUSD: number;
    pegTargetUSD: number;
    isDepegged: boolean;
    isLoading: boolean;
    error: boolean;
  };
}) {
  // Get ETH price from CoinGecko (same as anchor page)
  const { price: ethPrice, isLoading: isEthPriceLoading } =
    useCoinGeckoPrice("ethereum");

  // Get CoinGecko prices for fxUSD markets fallback
  const { price: fxSAVEPrice, isLoading: isFxSAVEPriceLoading } =
    useCoinGeckoPrice("fx-usd-saving");
  const { price: usdcPrice, isLoading: isUSDCPriceLoading } =
    useCoinGeckoPrice("usd-coin");

  // Get wstETH price from CoinGecko for fallback
  const { price: wstETHPrice, isLoading: isWstETHPriceLoading } =
    useCoinGeckoPrice("wrapped-steth");

  // Check if any CoinGecko prices are still loading
  const isCoinGeckoLoading =
    isEthPriceLoading ||
    isFxSAVEPriceLoading ||
    isUSDCPriceLoading ||
    isWstETHPriceLoading;

  // Get collateral price using the hook
  const priceOracleAddress = (market as any).addresses?.collateralPrice as
    | `0x${string}`
    | undefined;
  const {
    priceUSD: collateralPriceUSDFromHook,
    maxRate: wrappedRateFromHook,
    isLoading: isCollateralPriceLoading,
  } = useCollateralPrice(priceOracleAddress);

  // Fetch minter config and rebalanceThreshold to get min collateral ratio
  const minterAddress = (market as any).addresses?.minter as
    | `0x${string}`
    | undefined;
  const stabilityPoolManagerAddress = (market as any).addresses
    ?.stabilityPoolManager as `0x${string}` | undefined;

  const { data: minterConfigData } = useContractRead({
    address: minterAddress,
    abi: minterABI,
    functionName: "config",
    query: {
      enabled: !!minterAddress,
    },
  });

  // Import STABILITY_POOL_MANAGER_ABI dynamically to avoid adding to top-level imports
  const stabilityPoolManagerABI = [
    {
      inputs: [],
      name: "rebalanceThreshold",
      outputs: [{ type: "uint256", name: "" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const { data: rebalanceThresholdData } = useContractRead({
    address: stabilityPoolManagerAddress,
    abi: stabilityPoolManagerABI,
    functionName: "rebalanceThreshold",
    query: {
      enabled: !!stabilityPoolManagerAddress,
    },
  });

  // Calculate min collateral ratio and max leverage (same method as anchor page)
  const minCollateralRatio = useMemo(() => {
    // First, try to get from rebalanceThreshold (preferred method)
    if (
      rebalanceThresholdData !== undefined &&
      rebalanceThresholdData !== null
    ) {
      return rebalanceThresholdData as bigint;
    }

    // Fallback: Calculate from config as the lowest first boundary across all incentive configs
    if (!minterConfigData) return undefined;
    const config = minterConfigData as any;
    const allFirstBounds: bigint[] = [];

    if (
      config?.mintPeggedIncentiveConfig?.collateralRatioBandUpperBounds?.[0]
    ) {
      allFirstBounds.push(
        config.mintPeggedIncentiveConfig
          .collateralRatioBandUpperBounds[0] as bigint
      );
    }
    if (
      config?.redeemPeggedIncentiveConfig?.collateralRatioBandUpperBounds?.[0]
    ) {
      allFirstBounds.push(
        config.redeemPeggedIncentiveConfig
          .collateralRatioBandUpperBounds[0] as bigint
      );
    }
    if (
      config?.mintLeveragedIncentiveConfig?.collateralRatioBandUpperBounds?.[0]
    ) {
      allFirstBounds.push(
        config.mintLeveragedIncentiveConfig
          .collateralRatioBandUpperBounds[0] as bigint
      );
    }
    if (
      config?.redeemLeveragedIncentiveConfig
        ?.collateralRatioBandUpperBounds?.[0]
    ) {
      allFirstBounds.push(
        config.redeemLeveragedIncentiveConfig
          .collateralRatioBandUpperBounds[0] as bigint
      );
    }

    if (allFirstBounds.length > 0) {
      // Find the minimum (lowest) first boundary
      return allFirstBounds.reduce((min, current) =>
        current < min ? current : min
      );
    }
    return undefined;
  }, [rebalanceThresholdData, minterConfigData]);

  // Calculate max leverage: leverage = collateral ratio / (collateral ratio - 1)
  // Example: 130% CR = 1.3 means $130 collateral, $100 debt, $30 leveraged tokens
  // Leverage = $130 / $30 = 1.3 / 0.3 = 4.33x
  // Collateral ratio is in 18 decimals (e.g., 1.3e18 = 130% = 1.3)
  const maxLeverage = useMemo(() => {
    if (!minCollateralRatio) return undefined;
    // Convert from 18 decimals to decimal (e.g., 1.3e18 -> 1.3)
    const minCR = Number(minCollateralRatio) / 1e18;
    // Leverage = CR / (CR - 1)
    // For 130% (1.3): 1.3 / (1.3 - 1) = 1.3 / 0.3 = 4.33x
    return minCR / (minCR - 1);
  }, [minCollateralRatio]);

  // Get peg target and underlying token for description
  const pegTarget = (market as any).pegTarget || "USD";
  const underlyingToken =
    (market as any).collateral?.underlyingSymbol ||
    (market as any).collateral?.symbol ||
    "USD";

  // Calculate TVL in USD using collateral value and price from hook
  // IMPORTANT: minter.collateralTokenBalance() / collateralValue is in underlying-equivalent units
  // (fxUSD for fxUSD markets, stETH for wstETH markets). Do NOT multiply the amount by wrappedRate again.
  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  let tvlUSD: number | undefined;
  if (collateralValue) {
    const collateralTokensUnderlyingEq = Number(collateralValue) / 1e18;
    const wrappedRateNum =
      wrappedRateFromHook !== undefined
        ? Number(wrappedRateFromHook) / 1e18
        : 1.0; // Default 1:1 if no rate

    const collateralTokensWrapped =
      wrappedRateNum > 0
        ? collateralTokensUnderlyingEq / wrappedRateNum
        : collateralTokensUnderlyingEq;

    if (isFxUSDMarket && collateralTokensUnderlyingEq > 0) {
      // Calculate fxSAVE price in USD
      // Priority: CoinGecko fxSAVE price > getPrice() * ETH price > $1.08 fallback
      // Only calculate when all price sources are loaded
      let fxSAVEPriceUSD = 0;
      if (!isCollateralPriceLoading && !isCoinGeckoLoading) {
        // Prefer CoinGecko fxSAVE price if available and reasonable (> $1.00)
        if (fxSAVEPrice && fxSAVEPrice > 1.0) {
          fxSAVEPriceUSD = fxSAVEPrice;
        } else if (fxSAVEPriceInETH && ethPrice) {
          // fxSAVE price in ETH (from getPrice())
          const fxSAVEPriceInETHNum = Number(fxSAVEPriceInETH) / 1e18;
          // ETH price in USD (from CoinGecko)
          const ethPriceUSD = ethPrice;
          // fxSAVE price in USD = fxSAVE price in ETH * ETH price in USD
          const calculatedPrice = fxSAVEPriceInETHNum * ethPriceUSD;
          // Only use calculated price if it's reasonable (> $1.00), otherwise use fallback
          if (calculatedPrice > 1.0) {
            fxSAVEPriceUSD = calculatedPrice;
          } else {
            // Calculated price seems wrong, use fallback
            fxSAVEPriceUSD = 1.08;
          }
        } else {
          // Final fallback to $1.08 (current fxSAVE price)
          fxSAVEPriceUSD = 1.08;
        }
      }

      // Collateral USD = fxSAVE (wrapped) balance * fxSAVE price USD
      // Only calculate if we have a valid price (not loading)
      if (
        fxSAVEPriceUSD > 0 &&
        !isCollateralPriceLoading &&
        !isCoinGeckoLoading
      ) {
        tvlUSD = collateralTokensWrapped * fxSAVEPriceUSD;
      }
    } else if (!isFxUSDMarket && collateralTokensUnderlyingEq > 0) {
      // For wstETH markets: collateralValue is in underlying-equivalent (stETH).
      // Convert to wrapped (wstETH) by dividing by wrappedRate (stETH per wstETH).
      // Use CoinGecko wstETH price, otherwise derive wrapped price from oracle-underlying price * wrappedRate.
      // Only calculate when all price sources are loaded
      let effectivePrice = 0;
      if (!isCollateralPriceLoading && !isCoinGeckoLoading) {
        if (wstETHPrice) {
          // Fallback to CoinGecko wstETH price (same as anchor page logic)
          effectivePrice = wstETHPrice;
        } else if (collateralPriceUSDFromHook > 0 && tokenPrices?.pegTargetUSD) {
          // Oracle returns underlying price in peg target units; convert to USD and then to wrapped price.
          const underlyingPriceUSD =
            collateralPriceUSDFromHook * tokenPrices.pegTargetUSD;
          effectivePrice = underlyingPriceUSD * wrappedRateNum;
        } else {
          // Final fallback to $3960 (current wstETH price)
          effectivePrice = 3960;
        }
      }

      // Only calculate if we have a valid price (not loading)
      if (
        effectivePrice > 0 &&
        !isCollateralPriceLoading &&
        !isCoinGeckoLoading
      ) {
        tvlUSD = collateralTokensWrapped * effectivePrice;
      }
    }
  }

  const hasPosition = userDeposit && userDeposit > 0n;
  const totalPnL = pnlData ? pnlData.realizedPnL + pnlData.unrealizedPnL : 0;
  const totalPnLFormatted = totalPnL !== 0 ? formatPnL(totalPnL) : null;

  // Use token price from hook instead of manual calculation
  const computedTokenPriceUSD = tokenPrices?.leveragedPriceUSD;

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Left: Market Info & PnL */}
        <div className="space-y-2 flex flex-col">
          {/* Description Box */}
          <div className="bg-white p-4">
            <p className="text-xs text-[#1E4775]/80 leading-relaxed">
              Composable short {pegTarget} against {underlyingToken} with
              variable, rebalancing leverage and no funding fees.
              {minCollateralRatio !== undefined && (
                <>
                  {" "}
                  Rebalances at{" "}
                  {((Number(minCollateralRatio) / 1e18) * 100).toFixed(0)}%
                </>
              )}
            </p>
          </div>

          {/* PnL Details - only show if user has position */}
          {hasPosition && pnlData && (
            <div className="bg-white p-4 flex-1">
              <h3 className="text-[#1E4775] font-semibold mb-3 text-xs">
                Position Details
              </h3>
              {pnlData.error && !pnlData.isLoading && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                  PnL data is temporarily unavailable from the subgraph:{" "}
                  <span className="font-mono break-all">{pnlData.error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="text-[#1E4775]/70">Cost Basis:</div>
                <div className="text-[#1E4775] font-mono text-right">
                  {pnlData.isLoading || pnlData.error
                    ? "-"
                    : formatUSD(pnlData.costBasis)}
                </div>
                <div className="text-[#1E4775]/70">Current Value:</div>
                <div className="text-[#1E4775] font-mono text-right">
                  {formatUSD(currentValueUSD || 0)}
                </div>
                <div className="text-[#1E4775]/70">Unrealized PnL:</div>
                <div
                  className={`font-mono text-right ${
                    pnlData.isLoading
                      ? "text-[#1E4775]/50"
                      : formatPnL(pnlData.unrealizedPnL).color
                  }`}
                >
                  {pnlData.isLoading || pnlData.error
                    ? "-"
                    : `${formatPnL(pnlData.unrealizedPnL).text} (${
                        pnlData.unrealizedPnLPercent >= 0 ? "+" : ""
                      }${pnlData.unrealizedPnLPercent.toFixed(1)}%)`}
                </div>
                {!pnlData.isLoading &&
                  !pnlData.error &&
                  pnlData.realizedPnL &&
                  pnlData.realizedPnL !== 0 && (
                  <>
                    <div className="text-[#1E4775]/70">Realized PnL:</div>
                    <div
                      className={`font-mono text-right ${
                        formatPnL(pnlData.realizedPnL).color
                      }`}
                    >
                      {formatPnL(pnlData.realizedPnL).text}
                    </div>
                  </>
                )}
                <div className="text-[#1E4775]/70 font-semibold pt-1 border-t border-[#1E4775]/10">
                  Total PnL:
                </div>
                <div
                  className={`font-mono text-right font-semibold pt-1 border-t border-[#1E4775]/10 ${
                    pnlData.isLoading
                      ? "text-[#1E4775]/50"
                      : totalPnLFormatted?.color || ""
                  }`}
                >
                  {pnlData.isLoading || pnlData.error
                    ? "-"
                    : totalPnLFormatted?.text || "-"}
                </div>
              </div>
            </div>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 h-full flex flex-col">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">TVL</h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {(() => {
                  // collateralValue is in underlying tokens, convert to wrapped for display
                  // wrappedRate = underlying per wrapped (e.g., 1.07 fxUSD per fxSAVE)
                  // So: wrapped = underlying / wrappedRate
                  if (collateralValue) {
                    const underlyingAmount = Number(collateralValue) / 1e18;
                    const wrappedRateNum =
                      wrappedRateFromHook !== undefined
                        ? Number(wrappedRateFromHook) / 1e18
                        : 1.0;
                    const wrappedAmount = wrappedRateNum > 0
                      ? underlyingAmount / wrappedRateNum
                      : underlyingAmount;
                    return `${formatToken(
                      BigInt(Math.floor(wrappedAmount * 1e18))
                    )} ${market.collateral?.symbol || "ETH"}`;
                  }
                  return `- ${market.collateral?.symbol || "ETH"}`;
                })()}
              </p>
              {tvlUSD !== undefined && (
                <p className="text-xs text-[#1E4775]/70 mt-0.5">
                  {formatUSD(tvlUSD)}
                </p>
              )}
            </div>

            <div className="bg-white p-3 h-full flex flex-col">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                Token Price
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {computedTokenPriceUSD !== undefined
                  ? formatUSD(computedTokenPriceUSD)
                  : "-"}
              </p>
            </div>

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
                Leverage Ratio
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatLeverage(leverageRatio)}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Price Chart */}
        <div className="bg-white p-3 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-3 text-xs">
            Price Chart
          </h3>
          <div className="flex-1 min-h-72">
            <PriceChart
              tokenType="STEAMED"
              selectedToken={market.leveragedToken?.symbol || ""}
              marketId={marketId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SailPage() {
  const { address, isConnected } = useAccount();
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [manageModalTab, setManageModalTab] = useState<"mint" | "redeem">(
    "mint"
  );

  // Get sail marks from subgraph
  const {
    sailBalances,
    loading: isLoadingSailMarks,
    error: sailMarksError,
  } = useAnchorLedgerMarks({ enabled: true }); // Enable subgraph queries

  // Calculate total sail marks and marks per day from sail balances
  // Use useState + useEffect to ensure component re-renders when marks change every second
  const [totalSailMarksState, setTotalSailMarksState] = useState(0);

  // Update marks state whenever sailBalances change (they update every second via currentTime in the hook)
  useEffect(() => {
    if (!sailBalances || sailBalances.length === 0) {
      setTotalSailMarksState(0);
      if (process.env.NODE_ENV === "development") {
        console.log("[Sail Page] No sail balances, setting to 0");
      }
      return;
    }

    const totalMarks = sailBalances.reduce(
      (sum: number, balance: { estimatedMarks: number }) =>
        sum + balance.estimatedMarks,
      0
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[Sail Page] Updating totalSailMarksState", {
        totalMarks,
        sailBalancesCount: sailBalances.length,
        sailBalances: sailBalances.map(
          (b: { tokenAddress: string; estimatedMarks: number }) => ({
          token: b.tokenAddress,
          marks: b.estimatedMarks,
          })
        ),
      });
    }

    setTotalSailMarksState(totalMarks);
  }, [sailBalances]);

  const { totalSailMarks, sailMarksPerDay } = useMemo(() => {
    if (!sailBalances || sailBalances.length === 0) {
      return { totalSailMarks: 0, sailMarksPerDay: 0 };
    }

    const totalMarks = totalSailMarksState;
    const totalPerDay = sailBalances.reduce(
      (sum: number, balance: { marksPerDay: number }) =>
        sum + balance.marksPerDay,
      0
    );

    return {
      totalSailMarks: totalMarks,
      sailMarksPerDay: totalPerDay,
    };
  }, [totalSailMarksState, sailBalances]);

  // Sail marks boost window (2x) for markets in their first 8 days
  const sailBoostIds = useMemo(() => {
    if (!sailBalances || sailBalances.length === 0) return [];
    return sailBalances.map(
      (b: { tokenAddress: string }) => `sailToken-${b.tokenAddress.toLowerCase()}`
    );
  }, [sailBalances]);

  const { data: sailBoostWindowsData } = useMarketBoostWindows({
    enabled: !!address && isConnected && sailBoostIds.length > 0,
    ids: sailBoostIds,
    first: 50,
  });

  const activeSailBoostEndTimestamp = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const windows = sailBoostWindowsData?.marketBoostWindows ?? [];
    const active = windows
      .map((w) => ({
        start: Number(w.startTimestamp),
        end: Number(w.endTimestamp),
      }))
      .filter((w) => nowSec >= w.start && nowSec < w.end);
    if (active.length === 0) return null;
    return active.reduce((minEnd, w) => Math.min(minEnd, w.end), active[0].end);
  }, [sailBoostWindowsData]);

  // Get all markets with leveraged tokens (we'll filter by collateral balance later)
  const sailMarkets = useMemo(
    () => Object.entries(markets).filter(([_, m]) => m.leveragedToken),
    []
  );

  // Group markets by long side
  const groupedMarkets = useMemo(() => {
    const groups: Record<string, Array<[string, any]>> = {};
    sailMarkets.forEach(([id, m]) => {
      const longSide = getLongSide(m);
      if (!groups[longSide]) {
        groups[longSide] = [];
      }
      groups[longSide].push([id, m]);
    });
    return groups;
  }, [sailMarkets]);

  // Fetch contract data for all markets (ALWAYS 7 reads per market to ensure consistent offsets)
  // Reads: 0=leverageRatio, 1=leveragedTokenPrice, 2=collateralRatio, 3=collateralTokenBalance, 4=latestAnswer, 5=name, 6=totalSupply
  const { data: reads } = useContractReads({
    contracts: sailMarkets.flatMap(([_, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      const priceOracle = (m as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const leveragedTokenAddress = (m as any).addresses?.leveragedToken as
        | `0x${string}`
        | undefined;

      const isValidAddress = (addr: any): addr is `0x${string}` =>
        addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;

      // Skip entire market if minter is invalid - return empty array, this market won't be rendered
      if (!isValidAddress(minter)) {
        return [];
      }

      // Build contracts array - always include oracle and token reads if addresses are valid
      const contracts: any[] = [
        // 0: leverageRatio
        {
          address: minter,
          abi: minterABI,
          functionName: "leverageRatio" as const,
        },
        // 1: leveragedTokenPrice
        {
          address: minter,
          abi: minterABI,
          functionName: "leveragedTokenPrice" as const,
        },
        // 2: collateralRatio
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralRatio" as const,
        },
        // 3: collateralTokenBalance
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralTokenBalance" as const,
        },
      ];

      // 4: latestAnswer (oracle) - always add if valid
      if (isValidAddress(priceOracle)) {
        contracts.push({
          address: priceOracle,
          abi: wrappedPriceOracleABI,
          functionName: "latestAnswer" as const,
        });

        // For fxUSD markets, also call getPrice() to get fxSAVE price in ETH
        const collateralSymbol =
          (m as any).collateral?.symbol?.toLowerCase() || "";
        const isFxUSDMarket =
          collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
        if (isFxUSDMarket) {
          contracts.push({
            address: priceOracle,
            abi: wrappedPriceOracleABI,
            functionName: "getPrice" as const,
          });
        }
      }

      // 5 & 6: name and totalSupply (leveraged token) - always add if valid
      if (isValidAddress(leveragedTokenAddress)) {
        contracts.push({
          address: leveragedTokenAddress,
          abi: erc20MetadataABI,
          functionName: "name" as const,
        });
        contracts.push({
          address: leveragedTokenAddress,
          abi: erc20MetadataABI,
          functionName: "totalSupply" as const,
        });
      }

      return contracts;
    }),
    query: {
      enabled: sailMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
    },
  });

  // Calculate the offset for each market (since contract count varies per market)
  const marketOffsets = useMemo(() => {
    const offsets = new Map<number, number>();
    let currentOffset = 0;

    sailMarkets.forEach(([_, m], index) => {
      offsets.set(index, currentOffset);

      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      const priceOracle = (m as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const leveragedTokenAddress = (m as any).addresses?.leveragedToken as
        | `0x${string}`
        | undefined;

      const isValidAddress = (addr: any): boolean =>
        addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;

      if (!isValidAddress(minter)) {
        // No reads for invalid minter
        return;
      }

      // Always 4 minter reads
      currentOffset += 4;

      // Oracle read if valid
      if (isValidAddress(priceOracle)) {
        currentOffset += 1; // latestAnswer

        // For fxUSD markets, also add getPrice() call
        const collateralSymbol =
          (m as any).collateral?.symbol?.toLowerCase() || "";
        const isFxUSDMarket =
          collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
        if (isFxUSDMarket) {
          currentOffset += 1; // getPrice
        }
      }

      // Token reads if valid
      if (isValidAddress(leveragedTokenAddress)) {
        currentOffset += 2; // name + totalSupply
      }
    });

    return offsets;
  }, [sailMarkets]);

  // Fetch token prices using the hook
  const tokenPriceInputs = useMemo(() => {
    return sailMarkets
      .map(([id, m]) => {
        const minter = (m as any).addresses?.minter as
          | `0x${string}`
          | undefined;
        const pegTarget = (m as any).pegTarget || "USD";
        if (!minter || typeof minter !== "string" || !minter.startsWith("0x")) {
          return null;
        }
        return {
          marketId: id,
          minterAddress: minter,
          pegTarget: pegTarget,
        };
      })
      .filter((input): input is NonNullable<typeof input> => input !== null);
  }, [sailMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  // Fetch user's leveraged token balances for all markets
  const userDepositContracts = useMemo(() => {
    return sailMarkets
      .map(([_, m], index) => {
        const leveragedTokenAddress = (m as any).addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        if (
          !leveragedTokenAddress ||
          typeof leveragedTokenAddress !== "string" ||
          !leveragedTokenAddress.startsWith("0x") ||
          leveragedTokenAddress.length !== 42 ||
          !address
        )
          return null;
        return {
          marketIndex: index,
          contract: {
            address: leveragedTokenAddress,
            abi: erc20ABI,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [sailMarkets, address]);

  const useAnvil = false;
  const userDepositContractArray = useMemo(() => {
    return userDepositContracts.map((c) => c.contract);
  }, [userDepositContracts]);

  const wagmiUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: sailMarkets.length > 0 && !!address && !useAnvil,
      retry: 1,
      retryOnMount: false,
    },
  });

  const anvilUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
    enabled: sailMarkets.length > 0 && !!address && useAnvil,
    refetchInterval: 5000,
    },
  });

  const userDepositReads = useAnvil
    ? anvilUserDepositReads.data
    : wagmiUserDepositReads.data;

  // Create a map for quick lookup: marketIndex -> deposit balance
  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      const readResult = userDepositReads?.[contractIndex];
      // Handle both { result: ... } and direct result formats
      const balance =
        readResult && typeof readResult === "object" && "result" in readResult
          ? (readResult.result as bigint | undefined)
          : (readResult as bigint | undefined);
      map.set(marketIndex, balance);
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  return (
    <>
      <Head>
        <title>Sail</title>
        <meta
          name="description"
          content="Mint and redeem Sail (leveraged) tokens"
        />
      </Head>

      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            {/* Title - Full Row */}
            <div className="p-4 flex items-center justify-center mb-0">
              <h1 className="font-bold font-mono text-white text-7xl text-center">
                Sail
              </h1>
            </div>

            {/* Subheader */}
            <div className="flex items-center justify-center mb-2 -mt-6">
              <p className="text-white/80 text-lg text-center">
                Variable leverage tokens
              </p>
            </div>

            {/* Five Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* Mint Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <BanknotesIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Mint
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Mint leveraged tokens with amplified exposure to price
                  movements
                </p>
              </div>

              {/* Leverage Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    No funding fees
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Funding fee free leverage
                </p>
              </div>

              {/* Auto Rebalancing Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ShieldCheckIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Auto rebalancing
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Positions automatically rebalance to protect you from
                  liquidation
                </p>
              </div>

              {/* Ledger Marks Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <StarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Ledger Marks
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Earn Ledger marks for deposits: 5 per dollar per day
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
                  Redeem sail tokens for collateral at any time
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Subgraph Error Banner */}
          {sailMarksError && (
            <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded p-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                    Harbor Marks Subgraph Error
                  </p>
                  <p className="text-white/70 text-xs">
                    Unable to load Harbor Marks data. This may be due to rate
                    limiting or service issues. Your positions and core
                    functionality remain unaffected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sail Marks Section */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Header Box */}
            <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2">
              <h2 className="font-bold font-mono text-white text-2xl text-center">
                Sail Marks
              </h2>
              <InfoTooltip
                label={
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg mb-2">Sail Marks</h3>
                      <p className="text-white/90 leading-relaxed">
                        Earn marks for holding Sail tokens. Sail marks are
                        earned at 1 mark per dollar per day (with a 5x
                        multiplier).
                      </p>
                    </div>

                    <div className="border-t border-white/20 pt-3">
                      <p className="text-white/90 leading-relaxed mb-2">
                        Sail marks track your contribution to the Harbor
                        ecosystem through leveraged token positions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-white/70 mt-0.5">•</span>
                        <p className="text-white/90 leading-relaxed">
                          The more Sail tokens you hold, the more marks you
                          earn.
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
                  </div>
                }
                side="right"
              />
            </div>

            {/* Current Sail Marks Box */}
            <div className="bg-[#17395F] p-3">
              <div className="text-xs text-white/70 mb-0.5 text-center">
                Current Sail Marks
              </div>
              <div className="text-base font-bold text-white font-mono text-center">
                {isLoadingSailMarks
                  ? "-"
                  : totalSailMarks > 0
                  ? totalSailMarks.toLocaleString(undefined, {
                      minimumFractionDigits: totalSailMarks < 100 ? 2 : 0,
                      maximumFractionDigits: totalSailMarks < 100 ? 2 : 0,
                    })
                  : "0"}
              </div>
            </div>

            {/* Sail Marks per Day Box */}
            <div className="bg-[#17395F] p-3">
              <div className="text-xs text-white/70 mb-0.5 text-center">
                Sail Marks per Day
              </div>
              <div className="text-base font-bold text-white font-mono text-center">
                {isLoadingSailMarks
                  ? "-"
                  : sailMarksPerDay > 0
                  ? sailMarksPerDay.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  : "0"}
              </div>
            </div>
          </div>

          {activeSailBoostEndTimestamp && (
            <div className="mb-2">
              <MarksBoostBadge multiplier={2} endTimestamp={activeSailBoostEndTimestamp} />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 mb-3"></div>

          {/* Markets List - Grouped by Long Side */}
          <section className="space-y-4">
            {(() => {
              // Check if any markets have finished genesis (have collateral)
              const hasAnyFinishedMarkets = Object.entries(groupedMarkets).some(
                ([_, markets]) => {
                return markets.some(([id]) => {
                  const globalIndex = sailMarkets.findIndex(
                    ([marketId]) => marketId === id
                  );
                  const baseOffset = marketOffsets.get(globalIndex) ?? 0;
                  const collateralValue = reads?.[baseOffset + 3]?.result as
                    | bigint
                    | undefined;
                    return (
                      collateralValue !== undefined && collateralValue > 0n
                    );
                });
                }
              );

              // If no markets have finished genesis, show banner
              if (!hasAnyFinishedMarkets) {
                return (
                  <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
                    <p className="text-white text-lg font-medium">
                      Maiden Voyage in progress for Harbor's first markets -
                      coming soon!
                    </p>
                  </div>
                );
              }

              // Otherwise, show markets as usual
              return Object.entries(groupedMarkets).map(
                ([longSide, markets]) => {
                // Filter to only show markets where genesis has completed (has collateral)
                const activeMarkets = markets.filter(([id]) => {
                  const globalIndex = sailMarkets.findIndex(
                    ([marketId]) => marketId === id
                  );
                  const baseOffset = marketOffsets.get(globalIndex) ?? 0;
                  const collateralValue = reads?.[baseOffset + 3]?.result as
                    | bigint
                    | undefined;
                    return (
                      collateralValue !== undefined && collateralValue > 0n
                    );
                });

                // Skip this group if no markets have completed genesis
                if (activeMarkets.length === 0) {
                  return null;
                }

              return (
                <div key={longSide}>
                  <div className="pt-4 mb-3">
                    <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                      Long {longSide}
                    </h2>
                  </div>

                  {/* Header Row */}
                  <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                      <div className="min-w-0 text-center">Token</div>
                      <div className="text-center min-w-0">Leverage</div>
                          <div className="text-center min-w-0">
                            Your Position
                          </div>
                          <div className="text-center min-w-0">
                            Current Value
                          </div>
                      <div className="text-center min-w-0">Action</div>
                    </div>
                  </div>

                  {/* Market Rows */}
                  <div className="space-y-2">
                    {activeMarkets.map(([id, m]) => {
                      const globalIndex = sailMarkets.findIndex(
                        ([marketId]) => marketId === id
                      );
                      const userDeposit = userDepositMap.get(globalIndex);
                          const baseOffset =
                            marketOffsets.get(globalIndex) ?? 0;

                      // Check if this market has oracle and token addresses
                      const priceOracle = (m as any).addresses
                        ?.collateralPrice as `0x${string}` | undefined;
                      const leveragedTokenAddress = (m as any).addresses
                        ?.leveragedToken as `0x${string}` | undefined;
                      const isValidAddress = (addr: any): boolean =>
                        addr &&
                        typeof addr === "string" &&
                        addr.startsWith("0x") &&
                        addr.length === 42;
                      const hasOracle = isValidAddress(priceOracle);
                          const hasToken = isValidAddress(
                            leveragedTokenAddress
                          );

                      const tokenPrices = tokenPricesByMarket[id];

                      return (
                        <SailMarketRow
                          key={id}
                          id={id}
                          market={m}
                          baseOffset={baseOffset}
                          hasOracle={hasOracle}
                          hasToken={hasToken}
                          reads={reads}
                          userDeposit={userDeposit}
                          isExpanded={expandedMarket === id}
                          onToggleExpand={() =>
                                setExpandedMarket(
                                  expandedMarket === id ? null : id
                                )
                          }
                          onManageClick={() => {
                            setSelectedMarketId(id);
                            setSelectedMarket(m);
                            setManageModalTab("mint");
                            setManageModalOpen(true);
                          }}
                          isConnected={isConnected}
                          tokenPrices={tokenPrices}
                        />
                      );
                    })}
                  </div>
                </div>
              );
                }
              );
            })()}
          </section>
        </main>

        {/* Manage Modal */}
        {selectedMarketId && selectedMarket && (
          <SailManageModal
            isOpen={manageModalOpen}
            onClose={() => {
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
            }}
            marketId={selectedMarketId}
            market={selectedMarket}
            initialTab={manageModalTab}
            onSuccess={() => {
              // Refresh data if needed
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
            }}
          />
        )}
      </div>
    </>
  );
}
