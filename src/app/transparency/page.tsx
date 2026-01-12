"use client";

import React, { useMemo, useState } from "react";
import {
 useTransparencyData,
 formatCollateralRatio,
 formatLeverageRatio,
 formatIncentiveRatio,
 formatTokenPrice,
 formatTokenBalance,
 getHealthColor,
 calculatePeggedPriceUSD,
 getWithdrawalRequestStatus,
 type MarketTransparencyData,
 type PoolTransparencyData,
 type UserPoolData,
} from "@/hooks/useTransparencyData";
import { formatCompactUSD } from "@/utils/anchor";
import {
 ClipboardDocumentIcon,
 CheckIcon,
 ArrowPathIcon,
 ShieldCheckIcon,
 ExclamationTriangleIcon,
 XCircleIcon,
 ClockIcon,
 CurrencyDollarIcon,
 Squares2X2Icon,
 EyeIcon,
 ChevronDownIcon,
 ChevronUpIcon,
 ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { markets as marketsConfig } from "@/config/markets";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useReadContract, useAccount } from "wagmi";
import { minterABI } from "@/abis/minter";
import Image from "next/image";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

function formatUSD(value: number | undefined): string {
 if (value === undefined || !Number.isFinite(value)) return "-";
 return `$${value.toLocaleString(undefined, {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2,
 })}`;
}

function formatTokenBalanceMax2Decimals(balance: bigint, decimals: number = 18): string {
  if (balance === 0n) return "0";
  const num = Number(balance) / 10 ** decimals;
  if (num < 0.01) return "<0.01";
  if (num < 1000) return num.toFixed(2).replace(/\.?0+$/, "");
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

const WAD = 10n ** 18n;
type FeeBand = {
 lowerBound: bigint; // inclusive
 upperBound?: bigint; // inclusive
 ratio: bigint; // int256 (wad, where 1e18 = 100%)
};

function bandsFromConfig(config: any): FeeBand[] {
 if (!config) return [];
 const bounds: bigint[] = Array.isArray(config.collateralRatioBandUpperBounds)
   ? (config.collateralRatioBandUpperBounds as bigint[])
   : [];
 const ratiosRaw: unknown =
   (config as any).incentiveRatios ?? (config as any).incentiveRates;
 const ratios: bigint[] = Array.isArray(ratiosRaw) ? (ratiosRaw as bigint[]) : [];
 if (ratios.length === 0) return [];

 const bands: FeeBand[] = [];
 let prev = 0n;
 for (let i = 0; i < ratios.length; i++) {
   const isLast = i === ratios.length - 1;
   const upper = !isLast ? bounds[i] : undefined;
   bands.push({ lowerBound: prev, upperBound: upper, ratio: ratios[i] });
   if (upper !== undefined) prev = upper;
 }
 return bands;
}

function FeeBandBadge({ ratio }: { ratio: bigint }) {
 // ratio is WAD-scaled percent (1e18 = 100%)
 const pct = Number(ratio) / 1e16; // 1e16 => 1%
 const isBlocked = ratio >= WAD;
 const isDiscount = ratio < 0n;
 const isFree = ratio === 0n;

 const className = isBlocked
   ? "bg-red-500/30 text-red-700 font-semibold"
   : isDiscount
   ? "bg-green-500/30 text-green-700 font-semibold"
   : isFree
   ? "bg-blue-500/30 text-blue-700 font-semibold"
   : "bg-orange-500/30 text-orange-700 font-semibold";

 const label = isBlocked
   ? "Blocked"
   : isFree
   ? "Free"
   : isDiscount
   ? `${pct.toFixed(2)}% discount`
   : `${pct.toFixed(2)}% fee`;

 return (
   <span className={`px-1.5 py-0.5 rounded text-[9px] ${className}`}>{label}</span>
 );
}

function FeeTransparencyBands({
 minterAddress,
 currentCR,
}: {
 minterAddress: `0x${string}`;
 currentCR: bigint;
}) {
 const { data: configData } = useReadContract({
   address: minterAddress,
   abi: minterABI,
   functionName: "config",
 });

 const feeBands = useMemo(() => {
   const cfg = configData as any;
   if (!cfg) return null;
   return {
     mintPegged: bandsFromConfig(cfg.mintPeggedIncentiveConfig),
     mintLeveraged: bandsFromConfig(cfg.mintLeveragedIncentiveConfig),
     redeemPegged: bandsFromConfig(cfg.redeemPeggedIncentiveConfig),
     redeemLeveraged: bandsFromConfig(cfg.redeemLeveragedIncentiveConfig),
   };
 }, [configData]);

 const renderTable = (title: string, bands: FeeBand[] | undefined) => {
   if (!bands || bands.length === 0) {
     return (
       <div className="bg-white p-3">
         <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
           {title}
         </h5>
         <div className="text-[10px] text-[#1E4775]/60">Loading…</div>
       </div>
     );
   }

   return (
     <div className="bg-white p-3">
       <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
         {title}
       </h5>
       <div className="space-y-1">
         {bands.map((b, idx) => {
           const active =
             currentCR >= b.lowerBound && (b.upperBound === undefined || currentCR <= b.upperBound);
           const range = b.upperBound
             ? `${formatCollateralRatio(b.lowerBound)} – ${formatCollateralRatio(b.upperBound)}`
             : `> ${formatCollateralRatio(b.lowerBound)}`;
           return (
             <div
               key={idx}
               className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                 active ? "bg-[#1E4775]/10 border border-[#1E4775]/30" : "bg-[#1E4775]/5"
               }`}
             >
               <span className="text-[#1E4775]/70 font-mono">{range}</span>
               <FeeBandBadge ratio={b.ratio} />
             </div>
           );
         })}
       </div>
     </div>
   );
 };

 return (
   <div className="bg-white p-3">
     <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
       Fees & Incentives
     </h4>
     <div className="text-[10px] text-[#1E4775]/60 mb-2">
       Current CR: <span className="font-mono font-semibold">{formatCollateralRatio(currentCR)}</span>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
       {renderTable("Mint Anchor", feeBands?.mintPegged)}
       {renderTable("Mint Sail", feeBands?.mintLeveraged)}
       {renderTable("Redeem Anchor", feeBands?.redeemPegged)}
       {renderTable("Redeem Sail", feeBands?.redeemLeveraged)}
     </div>
   </div>
 );
}

// Copy to clipboard component
function CopyButton({ text, label }: { text: string; label?: string }) {
 const [copied, setCopied] = useState(false);

 const handleCopy = async () => {
 await navigator.clipboard.writeText(text);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 return (
 <button
 onClick={handleCopy}
 className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors group"
 title={`Copy ${label ||"address"}`}
 >
 <code className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 group-hover:bg-white/10 transition-colors">
 {text.slice(0, 6)}...{text.slice(-4)}
 </code>
 {copied ? (
 <CheckIcon className="h-3 w-3 text-harbor-mint" />
 ) : (
 <ClipboardDocumentIcon className="h-3 w-3" />
 )}
 </button>
 );
}

// Contract address item component
function ContractAddressItem({ label, address }: { label: string; address: string }) {
 const [copied, setCopied] = useState(false);

 const handleCopy = async (e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 await navigator.clipboard.writeText(address);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 } catch (err) {
 console.error("Failed to copy:", err);
 }
 };

 const etherscanUrl = `https://etherscan.io/address/${address}`;

 return (
 <div className="flex flex-col gap-1 py-1.5 px-2 bg-[#1E4775]/5 text-center">
 <span className="text-[#1E4775]/60 text-[10px]">{label}</span>
 <div className="flex items-center justify-center gap-1.5">
 <button
 onClick={handleCopy}
 className="flex items-center gap-1 text-[#1E4775] hover:text-[#1E4775]/80 transition-colors cursor-pointer group"
 title={`Copy ${label} address`}
 >
 <code className="font-mono text-[10px]">
 {address.slice(0, 6)}...{address.slice(-4)}
 </code>
 {copied ? (
 <CheckIcon className="h-3 w-3 text-harbor-mint" />
 ) : (
 <ClipboardDocumentIcon className="h-3 w-3 text-[#1E4775]/60 group-hover:text-[#1E4775]" />
 )}
 </button>
 <a
 href={etherscanUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#1E4775]/60 hover:text-[#1E4775] transition-colors"
 title={`View ${label} on Etherscan`}
 onClick={(e) => e.stopPropagation()}
 >
 <ArrowTopRightOnSquareIcon className="h-3 w-3" />
 </a>
 </div>
 </div>
 );
}

// Health indicator badge
function HealthBadge({
 status,
 compact = false,
}: {
 status:"green" |"yellow" |"red";
 compact?: boolean;
}) {
 const config = {
 green: {
 bg:"bg-green-500/20",
 text:"text-green-700",
 icon: ShieldCheckIcon,
 label:"Healthy",
 },
 yellow: {
 bg:"bg-yellow-500/20",
 text:"text-yellow-700",
 icon: ExclamationTriangleIcon,
 label:"Warning",
 },
 red: {
 bg:"bg-red-500/20",
 text:"text-red-700",
 icon: XCircleIcon,
 label:"Critical",
 },
 };

 const { bg, text, icon: Icon, label } = config[status];

 if (compact) {
 return (
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium ${bg} ${text}`}
 >
 <Icon className="h-3 w-3" />
 {label}
 </span>
 );
 }

 return (
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
 >
 <Icon className="h-3.5 w-3.5" />
 {label}
 </span>
 );
}

// Fee/Discount badge
function FeeBadge({ ratio }: { ratio: bigint }) {
 const { value, isDiscount } = formatIncentiveRatio(ratio);
 const isZero = ratio === 0n;

 if (isZero) {
 return (
 <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-white/60">
 0%
 </span>
 );
 }

 return (
 <span
 className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium ${
 isDiscount
 ?"bg-harbor-mint/20 text-harbor-mint"
 :"bg-harbor-coral/20 text-harbor-coral"
 }`}
 >
 {isDiscount ?"−" :"+"}
 {value}
 </span>
 );
}

// Withdrawal status badge
function WithdrawalStatusBadge({
 status,
}: {
 status:"none" |"waiting" |"open" |"expired";
}) {
 const config = {
 none: { bg:"bg-white/10", text:"text-white/40", label:"None" },
 waiting: { bg:"bg-blue-500/20", text:"text-blue-400", label:"Waiting" },
 open: { bg:"bg-harbor-mint/20", text:"text-harbor-mint", label:"Open" },
 expired: {
 bg:"bg-harbor-coral/20",
 text:"text-harbor-coral",
 label:"Expired",
 },
 };

 const { bg, text, label } = config[status];

 return (
 <span
 className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium ${bg} ${text}`}
 >
 <ClockIcon className="h-2.5 w-2.5" />
 {label}
 </span>
 );
}

// Data row component (compact)
function DataRow({
 label,
 value,
 tooltip,
 valueClassName ="",
}: {
 label: string;
 value: React.ReactNode;
 tooltip?: string;
 valueClassName?: string;
}) {
 return (
 <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
 <span className="text-white/60 text-xs flex items-center gap-1">
 {label}
 {tooltip && <InfoTooltip label={tooltip} />}
 </span>
 <span className={`text-xs font-medium ${valueClassName ||"text-white"}`}>
 {value}
 </span>
 </div>
 );
}

// Expandable Market Card
function MarketCard({
 market,
 pools,
 userPools,
 tokenPricesByMarket,
 fxSAVEPrice,
 wstETHPrice,
  stETHPrice,
  btcPrice,
  ethPrice,
  poolRewardsMap,
}: {
 market: MarketTransparencyData;
 pools: PoolTransparencyData[];
 userPools?: UserPoolData[];
 tokenPricesByMarket: Record<
   string,
   {
     peggedPriceUSD: number;
     leveragedPriceUSD: number;
     pegTargetUSD: number;
     isDepegged: boolean;
     isLoading: boolean;
     error: boolean;
   }
 >;
 fxSAVEPrice?: number;
 wstETHPrice?: number;
  stETHPrice?: number;
  btcPrice?: number;
  ethPrice?: number;
  poolRewardsMap: Map<`0x${string}`, { totalRewardAPR: number; poolAddress: `0x${string}` }>;
}) {
 const [isExpanded, setIsExpanded] = useState(false);

 const avgPrice = (market.minPrice + market.maxPrice) / 2n;
 const maxPrice = market.maxPrice; // Use maxPrice for collateral price (matches anchor page which uses maxUnderlyingPrice)
 const avgRate = (market.minRate + market.maxRate) / 2n;
 const healthStatus = getHealthColor(
 market.collateralRatio,
 market.rebalanceThreshold
 );

  const tokenPrices = tokenPricesByMarket[market.marketId];

  const marketCfg = (marketsConfig as any)?.[market.marketId];
  const collateralHeldSymbol: string =
    marketCfg?.collateral?.symbol || marketCfg?.collateral?.underlyingSymbol || "";

  // collateralTokenBalance is in underlying-equivalent units (fxUSD for fxSAVE markets, stETH for wstETH markets)
  // Convert to wrapped collateral units using avgRate (underlying per wrapped)
  const collateralHeldWrapped: bigint =
    avgRate > 0n
      ? (market.collateralTokenBalance * WAD) / avgRate
      : market.collateralTokenBalance;

  // Calculate TVL as the minter's total collateral value in USD (same as Anchor page)
  // collateralTokenBalance is in underlying-equivalent units (fxUSD for fxSAVE markets, stETH for wstETH markets)
  const collateralTokensUnderlyingEq = Number(market.collateralTokenBalance) / 1e18;
  const avgRateNum = Number(avgRate) / 1e18;
  const collateralTokensWrapped =
    avgRateNum > 0
      ? collateralTokensUnderlyingEq / avgRateNum
      : collateralTokensUnderlyingEq;

  // Determine wrapped token price in USD (fxSAVE or wstETH)
  // Use lowercase marketId to identify market type
  const marketIdLower = market.marketId.toLowerCase();
  let wrappedTokenPriceUSD = 0;
  
  if (marketIdLower.includes("fxusd") || marketIdLower.includes("fx-usd")) {
    // fxUSD market -> uses fxSAVE as wrapped collateral
    wrappedTokenPriceUSD = fxSAVEPrice || 1.07; // Fallback to ~$1.07
  } else if (marketIdLower.includes("steth") || marketIdLower.includes("eth")) {
    // stETH/ETH market -> uses wstETH as wrapped collateral
    // Prefer CoinGecko wstETH price
    wrappedTokenPriceUSD = wstETHPrice || 0;
    // Fallback: stETH price * wrapped rate
    if (wrappedTokenPriceUSD === 0 && stETHPrice && stETHPrice > 0 && avgRateNum > 0) {
      wrappedTokenPriceUSD = stETHPrice * avgRateNum;
    }
    // Fallback: oracle (peg-denominated) * peg USD * wrapped rate
    if (wrappedTokenPriceUSD === 0 && avgPrice > 0n && avgRateNum > 0) {
      const pegTargetLower = marketIdLower.includes("btc") ? "btc" : "eth";
      const pegUsd = pegTargetLower === "btc" ? (btcPrice || 0) : (ethPrice || 0);
      if (pegUsd > 0) {
        const underlyingInPeg = Number(avgPrice) / 1e18; // peg units per underlying
        const underlyingUsd = underlyingInPeg * pegUsd;
        wrappedTokenPriceUSD = underlyingUsd * avgRateNum;
      }
    }
  }
  
  const totalTVLUSD =
    collateralTokensWrapped > 0 && wrappedTokenPriceUSD > 0
      ? collateralTokensWrapped * wrappedTokenPriceUSD
      : 0;

 const distanceToThreshold =
 market.rebalanceThreshold > 0n
 ? ((Number(market.collateralRatio) - Number(market.rebalanceThreshold)) /
 Number(market.rebalanceThreshold)) *
 100
 : 0;

  // Calculate distribution for pie chart: Anchor Supply (3 parts) + Sail Supply
  const distributionData = useMemo(() => {
    const anchorSupply = market.peggedTokenBalance; // Total haToken supply
    const sailSupply = market.leveragedTokenBalance; // Total Sail token supply
    const collateralPoolTVL = pools.find(p => p.type === "collateral")?.tvl || 0n;
    const sailPoolTVL = pools.find(p => p.type === "leveraged")?.tvl || 0n;
    
    // Anchor Supply is divided into 3 parts:
    const anchorNotDeposited = anchorSupply > (collateralPoolTVL + sailPoolTVL) 
      ? anchorSupply - collateralPoolTVL - sailPoolTVL 
      : 0n;

    const data = [];
    
    // Anchor Supply parts (3 sections)
    if (anchorNotDeposited > 0n) {
      data.push({
        name: "Not Deposited",
        value: Number(anchorNotDeposited) / 1e18,
        rawValue: anchorNotDeposited,
      });
    }
    if (collateralPoolTVL > 0n) {
      data.push({
        name: "Collateral Pool",
        value: Number(collateralPoolTVL) / 1e18,
        rawValue: collateralPoolTVL,
      });
    }
    if (sailPoolTVL > 0n) {
      data.push({
        name: "Sail Pool",
        value: Number(sailPoolTVL) / 1e18,
        rawValue: sailPoolTVL,
      });
    }
    
    // Sail Supply (as separate slice)
    if (sailSupply > 0n) {
      data.push({
        name: "Sail Supply",
        value: Number(sailSupply) / 1e18,
        rawValue: sailSupply,
      });
    }

    return data;
  }, [market.peggedTokenBalance, market.leveragedTokenBalance, pools]);

 return (
 <div className="overflow-hidden">
 {/* Market Bar */}
 <div
 className={`cursor-pointer transition-colors ${
   isExpanded
     ? "bg-[rgb(var(--surface-selected-rgb))]"
     : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
 }`}
 onClick={() => setIsExpanded((v) => !v)}
 >
 <div className="p-3">
 <div className="lg:hidden space-y-2">
 <div className="flex items-center justify-between gap-2">
 <div className="text-[#1E4775] font-semibold text-sm truncate">
 {market.marketName}
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <HealthBadge status={healthStatus} compact />
 {isExpanded ? (
 <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
 ) : (
 <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
 )}
 </div>
 </div>

 <div className="grid grid-cols-[1.15fr_0.65fr_1.65fr_0.95fr] gap-x-2 gap-y-0 text-[10px]">
 <div className="flex flex-col gap-0.5 min-w-0">
 <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
 Collateral Ratio
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
 {formatCollateralRatio(market.collateralRatio)}
 </div>
 </div>
 <div className="flex flex-col gap-0.5 min-w-0">
 <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
 Leverage
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
 {formatLeverageRatio(market.leverageRatio)}
 </div>
 </div>
 <div className="flex flex-col gap-0.5 min-w-0">
 <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
 TVL
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap overflow-hidden">
 <span className="whitespace-nowrap">{formatCompactUSD(totalTVLUSD)}</span>
 {collateralHeldWrapped > 0n && (
 <span className="text-[#1E4775]/60 text-[10px] ml-1 truncate inline-block max-w-full align-bottom">
 ({formatTokenBalanceMax2Decimals(collateralHeldWrapped)}{" "}
 {collateralHeldSymbol || ""})
 </span>
 )}
 </div>
 </div>
 <div className="flex flex-col gap-0.5 min-w-0 items-end text-right">
 <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
 Threshold
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
 {formatCollateralRatio(market.rebalanceThreshold)}
 </div>
 </div>
 </div>
 </div>

 <div className="hidden lg:grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center text-sm">
 {/* Market Name */}
 <div className="whitespace-nowrap min-w-0 overflow-hidden">
 <div className="flex items-center justify-center gap-2">
 <div className="text-[#1E4775] font-semibold text-sm">
 {market.marketName}
 </div>
 {isExpanded ? (
 <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
 ) : (
 <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
 )}
 </div>
 </div>

{/* Collateral Ratio */}
<div className="text-center">
<div className="text-[#1E4775] font-mono text-sm font-semibold">
{formatCollateralRatio(market.collateralRatio)}
</div>
</div>

{/* Leverage Ratio */}
<div className="text-center">
<div className="text-[#1E4775] font-mono text-sm font-semibold">
{formatLeverageRatio(market.leverageRatio)}
</div>
</div>

{/* TVL */}
<div className="text-center">
<div className="text-[#1E4775] font-mono text-sm font-semibold">
{formatCompactUSD(totalTVLUSD)}
{collateralHeldWrapped > 0n && (
 <span className="text-[#1E4775]/60 text-xs ml-1">
 ({formatTokenBalanceMax2Decimals(collateralHeldWrapped)} {collateralHeldSymbol || ""})
 </span>
)}
</div>
</div>

{/* Rebalance Threshold */}
<div className="text-center">
<div className="text-[#1E4775] font-mono text-sm font-semibold">
{formatCollateralRatio(market.rebalanceThreshold)}
</div>
</div>

 {/* Health Status */}
 <div className="text-center">
 <HealthBadge status={healthStatus} compact />
 </div>
 </div>
 </div>
 </div>

 {/* Expanded Content */}
 {isExpanded && (
 <div className="bg-[rgb(var(--surface-selected-rgb))] border-t border-[#1E4775]/10 p-3">
 {/* Fees & Incentives (bands) */}
 <div className="mb-3">
 <FeeTransparencyBands minterAddress={market.minterAddress} currentCR={market.collateralRatio} />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
 {/* Token Prices & Supply */}
 <div className="bg-white p-2.5 space-y-2 lg:row-span-2">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Prices & Supply
 </h4>
 <div className="grid grid-cols-2 gap-1.5 text-xs">
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">
 Anchor Price
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {tokenPrices?.peggedPriceUSD && tokenPrices.peggedPriceUSD > 0
   ? formatUSD(tokenPrices.peggedPriceUSD)
   : "-"}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">
 Sail Price
 </div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {tokenPrices?.leveragedPriceUSD && tokenPrices.leveragedPriceUSD > 0
   ? formatUSD(tokenPrices.leveragedPriceUSD)
   : "-"}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">
 Anchor Supply
 </div>
 <div className="flex items-center justify-center gap-1">
 {market.marketName?.toLowerCase().includes("btc") ? (
 <Image
 src="/icons/haBTC.png"
 alt="haBTC"
 width={16}
 height={16}
 className="flex-shrink-0"
 />
 ) : (
 <Image
 src="/icons/haETH.png"
 alt="haETH"
 width={16}
 height={16}
 className="flex-shrink-0"
 />
 )}
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {formatTokenBalanceMax2Decimals(market.peggedTokenBalance)}
 </div>
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">
 Sail Supply
 </div>
 <div className="flex items-center justify-center gap-1">
 {(() => {
   // Determine sail token icon based on market type
   const marketIdLower = market.marketId.toLowerCase();
   const isBtcMarket = marketIdLower.includes("btc");
   const collateralLower = collateralHeldSymbol.toLowerCase();
   
   if (isBtcMarket) {
     // BTC markets
     if (collateralLower.includes("fxusd") || collateralLower.includes("fxsave")) {
       return (
         <Image
           src="/icons/hsUSDBTC.png"
           alt="hsUSDBTC"
           width={16}
           height={16}
           className="flex-shrink-0"
         />
       );
     } else if (collateralLower.includes("steth") || collateralLower.includes("wsteth")) {
       return (
         <Image
           src="/icons/hsETHBTC.png"
           alt="hsETHBTC"
           width={16}
           height={16}
           className="flex-shrink-0"
         />
       );
     }
   } else {
     // ETH markets
     if (collateralLower.includes("fxusd") || collateralLower.includes("fxsave")) {
       return (
         <Image
           src="/icons/hsUSDETH.png"
           alt="hsUSDETH"
           width={16}
           height={16}
           className="flex-shrink-0"
         />
       );
     }
   }
   // Fallback to default
   return (
     <Image
       src="/icons/hsUSDETH.png"
       alt="hsToken"
       width={16}
       height={16}
       className="flex-shrink-0"
     />
   );
 })()}
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {formatTokenBalanceMax2Decimals(market.leveragedTokenBalance)}
 </div>
 </div>
    </div>
    </div>

    {/* Distribution Pie Chart */}
    {distributionData.length > 0 && (
      <div className="mt-2 mb-1">
        <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
          Supply Distribution
        </h5>
        <div className="w-full" style={{ height: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => {
                  let color = "#1E4775"; // harbor-blue (default)
                  if (entry.name === "Not Deposited") {
                    color = "#1E4775"; // harbor-blue
                  } else if (entry.name === "Collateral Pool") {
                    color = "#9ED5BE"; // toned down seafoam green
                  } else if (entry.name === "Sail Pool") {
                    color = "#FF8A7A"; // harbor-coral (pearl orange)
                  } else if (entry.name === "Sail Supply") {
                    color = "#E9C46A"; // yellow
                  }
                  return <Cell key={`cell-${index}`} fill={color} stroke="#1E4775" strokeWidth={entry.name === "Sail Pool" ? 0 : 0} />;
                })}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  const total = distributionData.reduce((sum, item) => sum + item.value, 0);
                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return [
                    `${percent}%`,
                    name
                  ];
                }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '9px', 
                  paddingTop: '8px',
                  paddingBottom: '4px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  backgroundColor: 'rgba(30, 71, 117, 0.05)', // #1E4775/5
                  borderRadius: '4px',
                  marginTop: '8px',
                  marginBottom: '0px',
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'nowrap',
                  gap: '32px',
                  overflow: 'hidden'
                }}
                layout="horizontal"
                iconType="circle"
                formatter={(value: string) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    )}
  </div>

  {/* Stability Pools */}
 <div className="bg-white p-2.5 space-y-2 lg:col-span-2">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Stability Pools
 </h4>
 <div className="space-y-2">
 {pools.map((pool) => {
 const userData = userPools?.find(
 (u) => u.poolAddress === pool.address
 );
 // Both collateral and sail pools hold haBTC/haETH tokens, so use peggedPriceUSD for both
 const poolTokenPriceUSD = tokenPrices?.peggedPriceUSD ?? 0;
 const withdrawStatus = userData
 ? getWithdrawalRequestStatus(
 userData.withdrawalRequest.requestedAt,
 pool.withdrawWindow
 )
 :"none";

 return (
 <div key={pool.address} className="space-y-1.5">
 <div className="flex items-center gap-2">
 <span className="text-[#1E4775] font-semibold text-[10px] w-12">
 {pool.type ==="collateral" ?"Anchor" :"Sail"}
 </span>
 <div className="grid grid-cols-5 gap-1.5 text-xs flex-1">
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">TVL (USD)</div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {formatCompactUSD((Number(pool.tvl) / 1e18) * poolTokenPriceUSD)} ({formatTokenBalanceMax2Decimals(pool.tvl)} {market.marketName?.toLowerCase().includes("btc") ? "haBTC" : "haETH"})
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">APR</div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {(() => {
   // Get APR from poolRewardsMap (same as anchor page)
   const poolReward = poolRewardsMap.get(pool.address);
   const apr = poolReward?.totalRewardAPR ?? 0;
   // Format APR same as anchor page: show value if > 0, otherwise "-"
   return apr > 0 ? `${apr.toFixed(2)}%` : "-";
 })()}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">Early Fee</div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {(Number(pool.earlyWithdrawalFee) / 1e16).toFixed(2)}%
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">Wait period</div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {(Number(pool.withdrawWindow.startDelay) / 3600).toFixed(2)}h
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-1.5 text-center">
 <div className="text-[#1E4775]/60 text-[9px]">Fee-free duration</div>
 <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
 {(Number(pool.withdrawWindow.endWindow) / 3600).toFixed(2)}h
 </div>
 </div>
 </div>
 </div>
 {userData && userData.assetBalance > 0n && (
 <div className="pt-1.5 border-t border-[#1E4775]/10 flex items-center justify-between text-[10px]">
 <span className="text-[#1E4775]/70">Your Deposit</span>
 <span className="text-[#1E4775] font-mono font-semibold">
 {formatTokenBalanceMax2Decimals(userData.assetBalance)}
 </span>
 </div>
 )}
 {userData && userData.withdrawalRequest.amount > 0n && (
 <div className="flex items-center justify-between text-[10px]">
 <span className="text-[#1E4775]/70">Withdrawal</span>
 <div className="flex items-center gap-1.5">
 <span className="text-[#1E4775] font-mono">
 {formatTokenBalanceMax2Decimals(
 userData.withdrawalRequest.amount
 )}
 </span>
 <WithdrawalStatusBadge status={withdrawStatus} />
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Yield (Anchor Supply) */}
 <div className="bg-white p-2.5 space-y-2 lg:col-span-2">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Anchor Supply
 </h4>
 <div className="space-y-2">
  <div className="flex flex-col gap-2">
   <div className="flex items-center gap-2">
    <span className="text-[#1E4775] font-semibold text-[10px] w-12">
     Yield
    </span>
    <div className="grid grid-cols-5 gap-1.5 text-xs flex-1">
     {(() => {
      const anchorSupply = market.peggedTokenBalance;
      const collateralPoolTVL = pools.find(p => p.type === "collateral")?.tvl || 0n;
      const sailPoolTVL = pools.find(p => p.type === "leveraged")?.tvl || 0n;
      const anchorNotDeposited = anchorSupply > (collateralPoolTVL + sailPoolTVL) 
        ? anchorSupply - collateralPoolTVL - sailPoolTVL 
        : 0n;
      
      const anchorSupplyNum = Number(anchorSupply) / 1e18;
      const poolTokenPriceUSD = tokenPrices?.peggedPriceUSD ?? 0;
      const totalTVL = anchorSupplyNum * poolTokenPriceUSD;
      const tokenSymbol = market.marketName?.toLowerCase().includes("btc") ? "haBTC" : "haETH";

      const categories = [
        { name: "Not Deposited", value: anchorNotDeposited, color: "#1E4775" },
        { name: "Collateral Pool", value: collateralPoolTVL, color: "#9ED5BE" },
        { name: "Sail Pool", value: sailPoolTVL, color: "#FF8A7A" },
      ];

      // Calculate percentages for bar (based on Anchor Supply only, no Sail Supply)
      const notDepositedNum = Number(anchorNotDeposited) / 1e18;
      const collateralPoolNum = Number(collateralPoolTVL) / 1e18;
      const sailPoolNum = Number(sailPoolTVL) / 1e18;

      const notDepositedPercent = anchorSupplyNum > 0 ? (notDepositedNum / anchorSupplyNum) * 100 : 0;
      const collateralPoolPercent = anchorSupplyNum > 0 ? (collateralPoolNum / anchorSupplyNum) * 100 : 0;
      const sailPoolPercent = anchorSupplyNum > 0 ? (sailPoolNum / anchorSupplyNum) * 100 : 0;

      // TVL Yield Generator: Full TVL (minter's total collateral) converted to wrapped collateral token
      // Use the minter's total collateral TVL (totalTVLUSD) and wrapped collateral amount
      const tvlYieldGeneratorUSD = totalTVLUSD; // Full minter TVL in USD
      // collateralTokensWrapped is already in token units (not wei), convert to wei for formatting
      const tvlYieldGeneratorWrappedTokenWei = BigInt(Math.floor(collateralTokensWrapped * 1e18));
      const wrappedCollateralSymbol = market.marketId?.toLowerCase().includes("fxusd") || market.marketId?.toLowerCase().includes("fx-usd") ? "fxSAVE" : "wstETH";

      return (
        <>
          {/* First box: TVL USD */}
          <div className="bg-[#1E4775]/5 p-1.5 text-center">
            <div className="text-[#1E4775]/60 text-[9px]">TVL USD</div>
            <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
              {formatCompactUSD(totalTVL)}
            </div>
            <div className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
              {formatTokenBalanceMax2Decimals(anchorSupply)} {tokenSymbol}
            </div>
            <div className="text-[#1E4775]/60 font-mono text-[9px]">
              100.0%
            </div>
          </div>

          {/* Second box: TVL Yield Generator */}
          <div className="bg-[#1E4775]/5 p-1.5 text-center">
            <div className="text-[#1E4775]/60 text-[9px]">TVL Yield Generator</div>
            <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
              {formatCompactUSD(tvlYieldGeneratorUSD)}
            </div>
            <div className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
              {formatTokenBalanceMax2Decimals(tvlYieldGeneratorWrappedTokenWei)} {wrappedCollateralSymbol}
            </div>
          </div>

          {/* Three category boxes */}
          {categories.map((category) => {
            const valueNum = Number(category.value) / 1e18;
            const usdValue = valueNum * poolTokenPriceUSD;
            const percent = anchorSupplyNum > 0 ? ((valueNum / anchorSupplyNum) * 100).toFixed(1) : "0.0";

            return (
              <div key={category.name} className="bg-[#1E4775]/5 p-1.5 text-center">
                <div className="text-[#1E4775]/60 text-[9px]">{category.name}</div>
                <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                  {formatCompactUSD(usdValue)}
                </div>
                <div className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
                  {formatTokenBalanceMax2Decimals(category.value)} {tokenSymbol}
                </div>
                <div className="text-[#1E4775]/60 font-mono text-[9px]">
                  {percent}%
                </div>
              </div>
            );
          })}
        </>
      );
     })()}
    </div>
   </div>

   {/* Bar visualization underneath */}
   {(() => {
    const anchorSupply = market.peggedTokenBalance;
    const collateralPoolTVL = pools.find(p => p.type === "collateral")?.tvl || 0n;
    const sailPoolTVL = pools.find(p => p.type === "leveraged")?.tvl || 0n;
    const anchorNotDeposited = anchorSupply > (collateralPoolTVL + sailPoolTVL) 
      ? anchorSupply - collateralPoolTVL - sailPoolTVL 
      : 0n;
    
    const anchorSupplyNum = Number(anchorSupply) / 1e18;
    const notDepositedNum = Number(anchorNotDeposited) / 1e18;
    const collateralPoolNum = Number(collateralPoolTVL) / 1e18;
    const sailPoolNum = Number(sailPoolTVL) / 1e18;

    const notDepositedPercent = anchorSupplyNum > 0 ? (notDepositedNum / anchorSupplyNum) * 100 : 0;
    const collateralPoolPercent = anchorSupplyNum > 0 ? (collateralPoolNum / anchorSupplyNum) * 100 : 0;
    const sailPoolPercent = anchorSupplyNum > 0 ? (sailPoolNum / anchorSupplyNum) * 100 : 0;

    return (
      <div className="flex items-center gap-2">
       <div className="w-12"></div>
       <div className="flex-1 space-y-1">
        {/* Yield/No Yield indicator above bar */}
        <div className="relative flex items-center text-[8px] text-[#1E4775]/60 px-1" style={{ height: '14px' }}>
          {/* No yield label on left with arrow, aligned to pipe */}
          <span 
            className="absolute whitespace-nowrap text-right"
            style={{ 
              right: `${100 - notDepositedPercent}%`,
              paddingRight: '12px'
            }}
          >
            ⟵ no yield
          </span>
          {/* Yield label on right with arrow, aligned to pipe */}
          <span 
            className="absolute whitespace-nowrap text-left"
            style={{ 
              left: `${notDepositedPercent}%`,
              paddingLeft: '12px'
            }}
          >
            yield ⟶
          </span>
        </div>

        {/* Bar container */}
        <div className="relative h-4 bg-[#1E4775]/10 rounded overflow-visible">
          {/* Bar segments */}
          {notDepositedPercent > 0 && (
            <div 
              className="absolute top-0 bottom-0 bg-[#1E4775] rounded-l"
              style={{ left: '0%', width: `${notDepositedPercent}%` }}
            />
          )}
          {collateralPoolPercent > 0 && (
            <div 
              className="absolute top-0 bottom-0"
              style={{ backgroundColor: "#9ED5BE", left: `${notDepositedPercent}%`, width: `${collateralPoolPercent}%` }}
            />
          )}
          {sailPoolPercent > 0 && (
            <div 
              className="absolute top-0 bottom-0 bg-[#FF8A7A] rounded-r"
              style={{ left: `${notDepositedPercent + collateralPoolPercent}%`, width: `${sailPoolPercent}%` }}
            />
          )}

          {/* Vertical pipe/divider between yield and no yield - extends 10px above and below bar */}
          {/* No yield = Not Deposited; Yield = Collateral Pool + Sail Pool */}
          <div 
            className="absolute w-0.5 bg-red-500 z-10"
            style={{ 
              left: `${notDepositedPercent}%`,
              top: '-10px',
              bottom: '-10px'
            }}
          />
        </div>

        {/* Pool names below bar - aligned with segments */}
        <div className="relative flex text-[8px] text-[#1E4775]/60 px-1" style={{ height: '16px' }}>
          <div 
            className="absolute text-center"
            style={{ left: '0%', width: `${notDepositedPercent}%` }}
          >
            Not Deposited
          </div>
          <div 
            className="absolute text-center"
            style={{ left: `${notDepositedPercent}%`, width: `${collateralPoolPercent}%` }}
          >
            Collateral Pool
          </div>
          <div 
            className="absolute text-center"
            style={{ left: `${notDepositedPercent + collateralPoolPercent}%`, width: `${sailPoolPercent}%` }}
          >
            Sail Pool
          </div>
        </div>
       </div>
      </div>
    );
   })()}
  </div>
 </div>
 </div>
 </div>

 {/* Contract Addresses */}
 <div className="mt-3 bg-white p-3">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Contract Addresses
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
 {[
 { label:"Minter", address: market.minterAddress },
 { label:"Anchor Token", address: market.peggedTokenAddress },
 { label:"Sail Token", address: market.leveragedTokenAddress },
 { label:"Oracle", address: market.priceOracleAddress },
 { label:"Fee Receiver", address: market.feeReceiverAddress },
 { label:"Reserve Pool", address: market.reservePoolAddress },
 {
 label:"Pool Manager",
 address: market.stabilityPoolManagerAddress,
 },
 ...pools.map((pool) => ({
 label: pool.name,
 address: pool.address,
 })),
 ].map(({ label, address }) => (
 <ContractAddressItem key={label} label={label} address={address} />
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function TransparencyPage() {
 const {
 markets,
 pools,
 userPools,
 lastUpdatedTimestamp,
 isLoading,
 error,
 refetch,
 } = useTransparencyData();

 // Fetch wrapped collateral token prices for TVL calculation (same as Anchor page)
 const { price: fxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving");
 const { price: fxUSDPrice } = useCoinGeckoPrice("f-x-protocol-fxusd");
 const { price: wstETHPrice } = useCoinGeckoPrice("wrapped-steth");
 const { price: stETHPrice } = useCoinGeckoPrice("lido-staked-ethereum-steth");
 const { price: btcPrice } = useCoinGeckoPrice("bitcoin", 120000);
 const { price: ethPrice } = useCoinGeckoPrice("ethereum", 120000);

 const finishedMarkets = useMemo(
   () => markets.filter((m) => m.collateralTokenBalance > 0n),
   [markets]
 );

 const tokenPriceInputs = useMemo(() => {
   return finishedMarkets
     .map((m) => {
       const pegTarget =
         (marketsConfig as any)?.[m.marketId]?.pegTarget || "USD";
       return {
         marketId: m.marketId,
         minterAddress: m.minterAddress,
         pegTarget,
       };
     })
     .filter((x) => !!x.minterAddress);
 }, [finishedMarkets]);
 const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs as any);
 const { address: userAddress } = useAccount();

 // Build all pools from all markets for APR calculation (same approach as anchor page)
 const allPoolsForRewards = useMemo(() => {
   if (finishedMarkets.length === 0) return [];

   const poolsArray: Array<{
     address: `0x${string}`;
     poolType: "collateral" | "sail";
     marketId: string;
     peggedTokenPrice: bigint | undefined;
     collateralPrice: bigint | undefined;
     collateralPriceDecimals: number | undefined;
     peggedTokenAddress: `0x${string}` | undefined;
     collateralTokenAddress: `0x${string}` | undefined;
   }> = [];

   finishedMarkets.forEach((market) => {
     const marketCfg = (marketsConfig as any)?.[market.marketId];
     const maxPrice = market.maxPrice; // Use maxPrice (maxUnderlyingPrice) to match anchor page

     // Get pools for this market
     const marketPools = pools.filter(
       (p) =>
         p.address === market.stabilityPoolCollateralAddress ||
         p.address === market.stabilityPoolLeveragedAddress
     );

     marketPools.forEach((pool) => {
       poolsArray.push({
         address: pool.address,
         poolType: pool.type === "collateral" ? "collateral" as const : "sail" as const,
         marketId: market.marketId,
         peggedTokenPrice: market.peggedTokenPrice,
         collateralPrice: maxPrice, // Using maxPrice (maxUnderlyingPrice) to match anchor page
         collateralPriceDecimals: 18,
         peggedTokenAddress: market.peggedTokenAddress,
         collateralTokenAddress: marketCfg?.addresses?.wrappedCollateralToken as `0x${string}` | undefined,
       });
     });
   });

   return poolsArray;
 }, [finishedMarkets, pools]);

 // Build global token price map for all reward tokens (same as useAnchorRewards)
 const globalTokenPriceMap = useMemo(() => {
   const map = new Map<string, number>();

   finishedMarkets.forEach((market) => {
     const marketCfg = (marketsConfig as any)?.[market.marketId];
     const collateralHeldSymbol = marketCfg?.collateral?.symbol || marketCfg?.collateral?.underlyingSymbol || "";
     const maxPrice = market.maxPrice; // Use maxPrice to match anchor page

     // Add pegged token price (in underlying asset units, not USD)
     if (market.peggedTokenAddress && market.peggedTokenPrice) {
       const price = Number(market.peggedTokenPrice) / 1e18;
       map.set(market.peggedTokenAddress.toLowerCase(), price);
     }

     // Add wrapped collateral token price (reward tokens commonly include wrapped collateral, e.g. fxSAVE / wstETH)
     const wrappedCollateralTokenAddress = marketCfg?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
     const wrappedSymbol = collateralHeldSymbol.toLowerCase();
     if (wrappedCollateralTokenAddress) {
       let p: number | undefined;
       if (wrappedSymbol === "fxsave") p = fxSAVEPrice ?? undefined;
       else if (wrappedSymbol === "wsteth") p = wstETHPrice ?? undefined;
       else if (wrappedSymbol === "steth") p = stETHPrice ?? undefined;
       if (p && Number.isFinite(p) && p > 0) {
         map.set(wrappedCollateralTokenAddress.toLowerCase(), p);
       }
     }

     // Add collateral token price in USD if it might be used as a reward token
     // For fxUSD markets: use CoinGecko USD price (~$1), not oracle price (which is in ETH units)
     const collateralTokenAddress = marketCfg?.addresses?.collateralToken as `0x${string}` | undefined;
     if (collateralTokenAddress) {
       const collateralSymbol = collateralHeldSymbol.toLowerCase();
       // For fxUSD, use CoinGecko price in USD
       if (collateralSymbol === "fxusd") {
         // fxUSD should be priced at ~$1 USD
         const price = fxUSDPrice || 1.0;
         if (price > 0) {
           map.set(collateralTokenAddress.toLowerCase(), price);
         }
       }
       // For stETH/wstETH, the price is already added via wrappedCollateralTokenAddress
       // We don't need to add it again here
     }
   });

   return map;
 }, [finishedMarkets, fxSAVEPrice, fxUSDPrice, wstETHPrice, stETHPrice]);

 // Build peggedPriceUSDMap for APR calculation
 const peggedPriceUSDMap = useMemo(() => {
   const map: Record<string, bigint | undefined> = {};
   finishedMarkets.forEach((market) => {
     const tokenPrices = tokenPricesByMarket[market.marketId];
     if (tokenPrices?.peggedPriceUSD && tokenPrices.peggedPriceUSD > 0) {
       map[market.marketId] = BigInt(Math.floor(tokenPrices.peggedPriceUSD * 1e18));
     }
   });
   return map;
 }, [finishedMarkets, tokenPricesByMarket]);

 // Calculate APR for all pools at page level (same as anchor page)
 const { data: allPoolRewards = [] } = useAllStabilityPoolRewards({
   pools: allPoolsForRewards,
   tokenPriceMap: globalTokenPriceMap, // Pass the token price map for reward token price lookup
   ethPrice: ethPrice ?? undefined,
   btcPrice: btcPrice ?? undefined,
   peggedPriceUSDMap: Object.keys(peggedPriceUSDMap).length > 0 ? peggedPriceUSDMap : undefined,
   enabled: finishedMarkets.length > 0 && allPoolsForRewards.length > 0,
   overrideAddress: userAddress || ("0x0000000000000000000000000000000000000000" as `0x${string}`), // Use user address if available, otherwise dummy
 });

 // Create a map for quick lookup: poolAddress -> rewards (same as anchor page)
 const poolRewardsMap = useMemo(() => {
   const map = new Map<`0x${string}`, (typeof allPoolRewards)[0]>();
   allPoolRewards.forEach((poolReward) => {
     map.set(poolReward.poolAddress, poolReward);
   });
   return map;
 }, [allPoolRewards]);

 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative overflow-x-hidden">
 <main className="container mx-auto px-3 sm:px-4 lg:px-10 pb-6">
 {/* Header */}
 <div className="mb-2">
 {/* Title - Full Row */}
 <div className="p-4 flex items-center justify-center mb-0">
 <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
 Transparency
 </h1>
 </div>

 {/* Subheader */}
 <div className="flex items-center justify-center mb-2 -mt-2">
 <p className="text-white/80 text-lg text-center">
 Real-time protocol metrics from on-chain data
 </p>
 </div>

 {/* Info Boxes */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center justify-center mb-1">
 <EyeIcon className="w-5 h-5 text-white mr-2" />
 <h2 className="font-bold text-white text-sm text-center">
 Fully On-Chain
 </h2>
 </div>
 <p className="text-xs text-white/80 text-center">
 All data fetched directly from smart contracts
 </p>
 </div>
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center justify-center mb-1">
 <CurrencyDollarIcon className="w-5 h-5 text-white mr-2" />
 <h2 className="font-bold text-white text-sm text-center">
 Real-Time
 </h2>
 </div>
 <p className="text-xs text-white/80 text-center">
 Click refresh to update data
 </p>
 </div>
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center justify-center mb-1">
 <Squares2X2Icon className="w-5 h-5 text-white mr-2" />
 <h2 className="font-bold text-white text-sm text-center">
 All Markets
 </h2>
 </div>
 <p className="text-xs text-white/80 text-center">
 View metrics for all Harbor markets
 </p>
 </div>
 </div>
 </div>

 {/* Divider with refresh */}
 <div className="flex items-center justify-between border-t border-white/10 my-2 pt-2">
 <span className="text-white/40 text-[10px]" suppressHydrationWarning>
 Last updated: {new Date(lastUpdatedTimestamp).toLocaleString()}
 </span>
 <button
 onClick={() => refetch()}
 disabled={isLoading}
 className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-xs transition-colors disabled:opacity-50"
 >
 <ArrowPathIcon
 className={`h-3 w-3 ${isLoading ?"animate-spin" :""}`}
 />
 Refresh
 </button>
 </div>

 {/* Error state */}
 {error && (
 <div className="mb-3">
 <div className="bg-red-500/20 border border-red-500/30 p-3 text-red-300 text-sm">
 {error}
 </div>
 </div>
 )}

 {/* Check if any markets have finished genesis (have collateral) */}
 {!isLoading && finishedMarkets.length === 0 ? (
   <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
     <p className="text-white text-lg font-medium">
       Maiden Voyage in progress for Harbor's first markets - coming soon!
     </p>
   </div>
 ) : (
   <>
     {finishedMarkets.length > 0 && (
       <div className="hidden lg:block bg-white p-2 mb-2">
         <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-bold">
           <div className="text-center">Market</div>
           <div className="text-center">Collateral Ratio</div>
           <div className="text-center">Leverage</div>
           <div className="text-center">TVL (USD)</div>
           <div className="text-center">Threshold</div>
           <div className="text-center">Health</div>
         </div>
       </div>
     )}

     {isLoading && finishedMarkets.length === 0 ? (
       <div className="space-y-2">
         {[1, 2].map((i) => (
           <div key={i} className="animate-pulse h-14 bg-white/10" />
         ))}
       </div>
     ) : (
       <div className="space-y-2">
         {finishedMarkets.map((market) => (
           <MarketCard
             key={market.marketId}
             market={market}
             pools={pools.filter(
               (p) =>
                 p.address === market.stabilityPoolCollateralAddress ||
                 p.address === market.stabilityPoolLeveragedAddress
             )}
             userPools={userPools}
             tokenPricesByMarket={tokenPricesByMarket as any}
             fxSAVEPrice={fxSAVEPrice}
             wstETHPrice={wstETHPrice}
             stETHPrice={stETHPrice}
             btcPrice={btcPrice || undefined}
             ethPrice={ethPrice || undefined}
             poolRewardsMap={poolRewardsMap}
           />
         ))}
       </div>
     )}
   </>
 )}
 </main>
 </div>
 );
}

