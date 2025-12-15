"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { useAccount, useContractReads, usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { markets } from "@/config/markets";
import { useAnvilContractReads } from "@/hooks/useContractReads";
import { shouldUseAnvil } from "@/config/environment";
import { publicClient as anvilPublicClient } from "@/config/rpc";
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
import { SailManageModal } from "@/components/SailManageModal";

// Event ABIs for PnL calculation
const MINT_LEVERAGED_TOKEN_EVENT = parseAbiItem(
  "event MintLeveragedToken(address indexed sender, address indexed receiver, uint256 collateralIn, uint256 leveragedOut)"
);

const REDEEM_LEVERAGED_TOKEN_EVENT = parseAbiItem(
  "event RedeemLeveragedToken(address indexed sender, address indexed receiver, uint256 leveragedTokenBurned, uint256 collateralOut)"
);

// Genesis deposit event - used for cost basis of tokens received from genesis
const GENESIS_DEPOSIT_EVENT = parseAbiItem(
  "event Deposit(address indexed sender, address indexed receiver, uint256 collateralIn)"
);

// Oracle ABI for historical price lookups
const oracleABI = [
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

interface PnLData {
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  isLoading: boolean;
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

// Helper to fetch logs in batches (max 1000 blocks per request for public RPCs)
async function getLogsInBatches(
  client: any,
  params: {
    address: `0x${string}`;
    event: any;
    args?: any;
    fromBlock: bigint;
    toBlock: bigint;
  },
  batchSize = 900n // Use 900 to stay under 1000 limit
): Promise<any[]> {
  const allLogs: any[] = [];
  let currentFrom = params.fromBlock;

  while (currentFrom <= params.toBlock) {
    const currentTo =
      currentFrom + batchSize > params.toBlock
        ? params.toBlock
        : currentFrom + batchSize;

    try {
      const logs = await client.getLogs({
        ...params,
        fromBlock: currentFrom,
        toBlock: currentTo,
      });
      allLogs.push(...logs);
    } catch (error) {
      // If batch fails, skip this range
      console.warn(`Failed to fetch logs from ${currentFrom} to ${currentTo}`);
    }

    currentFrom = currentTo + 1n;
  }

  return allLogs;
}

// Hook to calculate PnL from event logs (includes genesis deposits for cost basis)
function usePnLCalculation(
  userAddress: `0x${string}` | undefined,
  minterAddress: `0x${string}` | undefined,
  genesisAddress: `0x${string}` | undefined,
  oracleAddress: `0x${string}` | undefined,
  userBalance: bigint | undefined,
  currentValueUSD: number | undefined,
  currentCollateralPriceUSD: bigint | undefined,
  currentWrappedRate: bigint | undefined,
  enabled: boolean
): PnLData {
  const wagmiClient = usePublicClient();
  const client = shouldUseAnvil() ? anvilPublicClient : wagmiClient;

  const [pnlData, setPnlData] = useState<PnLData>({
    costBasis: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    realizedPnL: 0,
    isLoading: false,
  });
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (
      !enabled ||
      !client ||
      !userAddress ||
      !minterAddress ||
      !oracleAddress ||
      !userBalance ||
      userBalance === 0n ||
      hasFetched
    ) {
      return;
    }

    const fetchPnL = async () => {
      setPnlData((prev) => ({ ...prev, isLoading: true }));

      try {
        const currentBlock = await client.getBlockNumber();
        // Start from deployment block (block 23993255 per subgraph docs)
        // This avoids querying unnecessary blocks
        const deploymentBlock = 23993255n;
        const fromBlock = deploymentBlock;

        // Fetch mint events where user is receiver (in batches)
        const mintLogs = await getLogsInBatches(client, {
          address: minterAddress,
          event: MINT_LEVERAGED_TOKEN_EVENT,
          args: { receiver: userAddress },
          fromBlock,
          toBlock: currentBlock,
        });

        // Fetch redeem events where user is sender (in batches)
        const redeemLogs = await getLogsInBatches(client, {
          address: minterAddress,
          event: REDEEM_LEVERAGED_TOKEN_EVENT,
          args: { sender: userAddress },
          fromBlock,
          toBlock: currentBlock,
        });

        // Fetch genesis deposit events if genesis address is available
        // Genesis deposits result in 50% leveraged tokens, so cost basis = 50% of deposit
        let genesisLogs: any[] = [];
        if (genesisAddress) {
          try {
            genesisLogs = await getLogsInBatches(client, {
              address: genesisAddress,
              event: GENESIS_DEPOSIT_EVENT,
              args: { receiver: userAddress },
              fromBlock,
              toBlock: currentBlock,
            });
          } catch {
            // Genesis contract might not exist or have different event signature
          }
        }

        // Sort all events by block number
        const allEvents = [
          ...genesisLogs.map((log) => ({ ...log, type: "genesis" as const })),
          ...mintLogs.map((log) => ({ ...log, type: "mint" as const })),
          ...redeemLogs.map((log) => ({ ...log, type: "redeem" as const })),
        ].sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

        // Process events using FIFO for cost basis
        interface Lot {
          qty: bigint;
          costUSD: number;
        }
        const lots: Lot[] = [];
        let totalRealized = 0;

        for (const event of allEvents) {
          // Get oracle price at event block
          let priceUSD = currentCollateralPriceUSD || 0n;
          let rate = currentWrappedRate || BigInt("1000000000000000000");

          try {
            const oracleResult = await client.readContract({
              address: oracleAddress,
              abi: oracleABI,
              functionName: "latestAnswer",
              blockNumber: event.blockNumber,
            });

            if (Array.isArray(oracleResult)) {
              priceUSD = oracleResult[1];
              rate = oracleResult[3];
            } else if (typeof oracleResult === "bigint") {
              priceUSD = oracleResult;
            } else if (typeof oracleResult === "object") {
              const obj = oracleResult as any;
              priceUSD = obj.maxUnderlyingPrice || priceUSD;
              rate = obj.maxWrappedRate || rate;
            }
          } catch {
            // Use current prices as fallback
          }

          const priceNum = Number(priceUSD) / 1e18;
          const rateNum = Number(rate) / 1e18;

          if (event.type === "genesis") {
            // Genesis deposits: user receives 50% pegged, 50% leveraged tokens
            // Cost basis for leveraged tokens = 50% of the deposit value
            const collateralIn = event.args.collateralIn as bigint;
            const totalDepositUSD = (Number(collateralIn) / 1e18) * priceNum * rateNum;
            const leveragedCostUSD = totalDepositUSD * 0.5; // 50% allocation to leveraged
            // Estimate leveraged tokens received (50% of deposit in collateral terms, at ~1:1 ratio)
            // This is approximate since we don't have the exact leveraged amount from this event
            const estimatedLeveragedTokens = collateralIn / 2n;
            if (leveragedCostUSD > 0) {
              lots.push({ qty: estimatedLeveragedTokens, costUSD: leveragedCostUSD });
            }
          } else if (event.type === "mint") {
            const collateralIn = event.args.collateralIn as bigint;
            const leveragedOut = event.args.leveragedOut as bigint;
            const costUSD = (Number(collateralIn) / 1e18) * priceNum * rateNum;
            lots.push({ qty: leveragedOut, costUSD });
          } else if (event.type === "redeem") {
            const leveragedBurned = event.args.leveragedTokenBurned as bigint;
            const collateralOut = event.args.collateralOut as bigint;
            const redeemValueUSD =
              (Number(collateralOut) / 1e18) * priceNum * rateNum;

            // FIFO: reduce lots
            let remaining = leveragedBurned;
            let matchedCost = 0;

            while (remaining > 0n && lots.length > 0) {
              const lot = lots[0];
              if (lot.qty <= remaining) {
                matchedCost += lot.costUSD;
                remaining -= lot.qty;
                lots.shift();
              } else {
                const fraction = Number(remaining) / Number(lot.qty);
                matchedCost += lot.costUSD * fraction;
                lot.qty -= remaining;
                lot.costUSD *= 1 - fraction;
                remaining = 0n;
              }
            }

            totalRealized += redeemValueUSD - matchedCost;
          }
        }

        // Calculate remaining cost basis
        const costBasis = lots.reduce((sum, lot) => sum + lot.costUSD, 0);
        const unrealizedPnL = (currentValueUSD || 0) - costBasis;
        const unrealizedPnLPercent =
          costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

        setPnlData({
          costBasis,
          unrealizedPnL,
          unrealizedPnLPercent,
          realizedPnL: totalRealized,
          isLoading: false,
        });
        setHasFetched(true);
      } catch (e) {
        console.error("Error calculating PnL:", e);
        setPnlData((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchPnL();
  }, [
    enabled,
    client,
    userAddress,
    minterAddress,
    genesisAddress,
    oracleAddress,
    userBalance,
    currentValueUSD,
    currentCollateralPriceUSD,
    currentWrappedRate,
    hasFetched,
  ]);

  return pnlData;
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
  }

  // Get token name and total supply (after oracle if it exists)
  const tokenOffset = hasOracle ? 5 : 4;
  const tokenName = hasToken ? reads?.[baseOffset + tokenOffset]?.result as string | undefined : undefined;
  const totalSupply = hasToken ? reads?.[baseOffset + tokenOffset + 1]?.result as bigint | undefined : undefined;
  const shortSide = parseShortSide(tokenName, market);

  // Calculate current value in USD using collateral value and collateral ratio
  // HS token value = Total Collateral Value - HA token claims
  // HA claims = Collateral Value / Collateral Ratio
  // HS value = Collateral Value * (1 - 1/CR)
  let currentValueUSD: number | undefined;
  if (
    userDeposit &&
    collateralValue &&
    collateralRatio &&
    collateralPriceUSD &&
    totalSupply &&
    totalSupply > 0n
  ) {
    const rate = wrappedRate || BigInt("1000000000000000000");

    // Calculate total collateral value in USD
    // collateralValue is in wrapped collateral (18 decimals)
    // collateralPriceUSD is USD per underlying (18 decimals)
    // rate is wrapped to underlying conversion (18 decimals)
    const collateralValueNum = Number(collateralValue) / 1e18;
    const usdNum = Number(collateralPriceUSD) / 1e18;
    const rateNum = Number(rate) / 1e18;
    const totalCollateralUSD = collateralValueNum * usdNum * rateNum;

    // Calculate HS token total value
    // Collateral ratio is in 18 decimals (e.g., 1.5e18 = 150%)
    const crNum = Number(collateralRatio) / 1e18;
    const haClaimsUSD = totalCollateralUSD / crNum;
    const hsValueTotalUSD = totalCollateralUSD - haClaimsUSD;

    // Calculate HS price per token
    const totalSupplyNum = Number(totalSupply) / 1e18;
    const hsPriceUSD = hsValueTotalUSD / totalSupplyNum;

    // Calculate user's position value
    const balanceNum = Number(userDeposit) / 1e18;
    currentValueUSD = balanceNum * hsPriceUSD;
  }

  // Get addresses for PnL calculation
  const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
  const genesisAddress = market.addresses?.genesis as `0x${string}` | undefined;
  const oracleAddress = market.addresses?.collateralPrice as
    | `0x${string}`
    | undefined;

  // Calculate PnL - only when user has a position
  // Includes genesis deposits in cost basis calculation
  const pnlData = usePnLCalculation(
    address,
    minterAddress,
    genesisAddress,
    oracleAddress,
    userDeposit,
    currentValueUSD,
    collateralPriceUSD,
    wrappedRate,
    !!userDeposit && userDeposit > 0n
  );

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
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#1E4775] font-medium">
                Short {shortSide}
              </span>
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
              )}
            </div>
            <div className="text-xs text-[#1E4775]/50 font-mono text-center mt-0.5">
              {market.leveragedToken.symbol}
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
            {userDeposit && pnlData.isLoading && (
              <div className="text-[10px] text-[#1E4775]/50">
                Loading PnL...
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
          pnlData={pnlData}
          currentValueUSD={currentValueUSD}
          userDeposit={userDeposit}
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
  pnlData,
  currentValueUSD,
  userDeposit,
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
  pnlData?: PnLData;
  currentValueUSD?: number;
  userDeposit?: bigint;
}) {
  // Calculate TVL in USD
  let tvlUSD: number | undefined;
  if (collateralValue && collateralPriceUSD) {
    const rate = wrappedRate || BigInt("1000000000000000000");
    const valueNum = Number(collateralValue) / 1e18;
    const priceNum = Number(collateralPriceUSD) / 1e18;
    const rateNum = Number(rate) / 1e18;
    tvlUSD = valueNum * priceNum * rateNum;
  }

  const hasPosition = userDeposit && userDeposit > 0n;
  const totalPnL = pnlData ? pnlData.realizedPnL + pnlData.unrealizedPnL : 0;
  const totalPnLFormatted = totalPnL !== 0 ? formatPnL(totalPnL) : null;

  const computedTokenPrice = useMemo(() => {
    if (
      !collateralValue ||
      !leverageRatio ||
      leverageRatio === 0n ||
      !totalSupply ||
      totalSupply === 0n
    ) {
      return undefined;
    }
    const oneEther = BigInt("1000000000000000000");
    const totalLeveragedValue = (collateralValue * oneEther) / leverageRatio;
    return totalLeveragedValue / totalSupply;
  }, [collateralValue, leverageRatio, totalSupply]);

  // Calculate token price in USD
  const computedTokenPriceUSD = useMemo(() => {
    if (!computedTokenPrice || !collateralPriceUSD || !wrappedRate) {
      return undefined;
    }
    // Convert token price from collateral units to USD
    // computedTokenPrice is in wrapped collateral units (18 decimals)
    // collateralPriceUSD is USD per underlying (18 decimals)
    // wrappedRate is wrapped to underlying conversion (18 decimals)
    // Formula: tokenPrice * wrappedRate * underlyingPriceUSD / 1e36
    // This gives us USD value with 18 decimals
    const oneE18 = BigInt("1000000000000000000");
    const oneE36 = oneE18 * oneE18;
    const tokenPriceUSD_18dec =
      (computedTokenPrice * wrappedRate * collateralPriceUSD) / oneE36;
    return Number(tokenPriceUSD_18dec) / 1e18;
  }, [computedTokenPrice, collateralPriceUSD, wrappedRate]);

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Left: Market Info & PnL */}
        <div className="space-y-2 flex flex-col">
          {/* PnL Details - only show if user has position */}
          {hasPosition && pnlData && !pnlData.isLoading && (
            <div className="bg-white p-4 flex-1">
              <h3 className="text-[#1E4775] font-semibold mb-3 text-xs">
                Position Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="text-[#1E4775]/70">Cost Basis:</div>
                <div className="text-[#1E4775] font-mono text-right">
                  {formatUSD(pnlData.costBasis)}
                </div>
                <div className="text-[#1E4775]/70">Current Value:</div>
                <div className="text-[#1E4775] font-mono text-right">
                  {formatUSD(currentValueUSD || 0)}
                </div>
                <div className="text-[#1E4775]/70">Unrealized PnL:</div>
                <div
                  className={`font-mono text-right ${
                    formatPnL(pnlData.unrealizedPnL).color
                  }`}
                >
                  {formatPnL(pnlData.unrealizedPnL).text} (
                  {pnlData.unrealizedPnLPercent >= 0 ? "+" : ""}
                  {pnlData.unrealizedPnLPercent.toFixed(1)}%)
                </div>
                {pnlData.realizedPnL !== 0 && (
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
                    totalPnLFormatted?.color || ""
                  }`}
                >
                  {totalPnLFormatted?.text || "-"}
                </div>
              </div>
            </div>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 h-full flex flex-col">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">TVL</h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatToken(collateralValue)}
                {""}
                {market.collateral?.symbol || "ETH"}
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
          <div className="h-[300px] flex-1">
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
  const { sailBalances, loading: isLoadingSailMarks } = useAnchorLedgerMarks();

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
      (sum, balance) => sum + balance.estimatedMarks,
      0
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[Sail Page] Updating totalSailMarksState", {
        totalMarks,
        sailBalancesCount: sailBalances.length,
        sailBalances: sailBalances.map((b) => ({
          token: b.tokenAddress,
          marks: b.estimatedMarks,
        })),
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
      (sum, balance) => sum + balance.marksPerDay,
      0
    );

    return {
      totalSailMarks: totalMarks,
      sailMarksPerDay: totalPerDay,
    };
  }, [totalSailMarksState, sailBalances]);

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
      const priceOracle = (m as any).addresses?.collateralPrice as `0x${string}` | undefined;
      const leveragedTokenAddress = (m as any).addresses?.leveragedToken as `0x${string}` | undefined;
      
      const isValidAddress = (addr: any): boolean =>
        addr && typeof addr === "string" && addr.startsWith("0x") && addr.length === 42;
      
      if (!isValidAddress(minter)) {
        // No reads for invalid minter
        return;
      }
      
      // Always 4 minter reads
      currentOffset += 4;
      
      // Oracle read if valid
      if (isValidAddress(priceOracle)) {
        currentOffset += 1;
      }
      
      // Token reads if valid
      if (isValidAddress(leveragedTokenAddress)) {
        currentOffset += 2; // name + totalSupply
      }
    });
    
    return offsets;
  }, [sailMarkets]);

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

  const useAnvil = shouldUseAnvil();
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

  const anvilUserDepositReads = useAnvilContractReads({
    contracts: userDepositContractArray,
    enabled: sailMarkets.length > 0 && !!address && useAnvil,
    refetchInterval: 5000,
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
                    Leverage
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  No funding fees - There are no ongoing fees for holding Sail
                  tokens
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
                  Earn ledger marks for deposits: 1 ledger mark per dollar per
                  day
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
                      maximumFractionDigits: 0,
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

          {/* Divider */}
          <div className="border-t border-white/10 mb-3"></div>

          {/* Markets List - Grouped by Long Side */}
          <section className="space-y-4">
            {Object.entries(groupedMarkets).map(([longSide, markets]) => {
              // Filter to only show markets where genesis has completed (has collateral)
              const activeMarkets = markets.filter(([id]) => {
                const globalIndex = sailMarkets.findIndex(
                  ([marketId]) => marketId === id
                );
                const baseOffset = marketOffsets.get(globalIndex) ?? 0;
                const collateralValue = reads?.[baseOffset + 3]?.result as bigint | undefined;
                return collateralValue !== undefined && collateralValue > 0n;
              });
              
              // Skip this group if no markets have completed genesis
              if (activeMarkets.length === 0) {
                return null;
              }
              
              return (
              <div key={longSide}>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Long {longSide}
                </h2>

                {/* Header Row */}
                <div className="bg-white p-3 overflow-x-auto mb-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
                    <div className="min-w-0 text-center">Token</div>
                    <div className="text-center min-w-0">Leverage</div>
                    <div className="text-center min-w-0">Your Position</div>
                    <div className="text-center min-w-0">Current Value</div>
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
                    const baseOffset = marketOffsets.get(globalIndex) ?? 0;
                    
                    // Check if this market has oracle and token addresses
                    const priceOracle = (m as any).addresses?.collateralPrice as `0x${string}` | undefined;
                    const leveragedTokenAddress = (m as any).addresses?.leveragedToken as `0x${string}` | undefined;
                    const isValidAddress = (addr: any): boolean =>
                      addr && typeof addr === "string" && addr.startsWith("0x") && addr.length === 42;
                    const hasOracle = isValidAddress(priceOracle);
                    const hasToken = isValidAddress(leveragedTokenAddress);

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
                          setExpandedMarket(expandedMarket === id ? null : id)
                        }
                        onManageClick={() => {
                          setSelectedMarketId(id);
                          setSelectedMarket(m);
                          setManageModalTab("mint");
                          setManageModalOpen(true);
                        }}
                        isConnected={isConnected}
                      />
                    );
                  })}
                </div>
              </div>
              );
            })}
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
