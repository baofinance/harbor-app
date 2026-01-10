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
import { useReadContract } from "wagmi";
import { minterABI } from "@/abis/minter";
import Image from "next/image";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";

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
}) {
 const [isExpanded, setIsExpanded] = useState(false);

 const avgPrice = (market.minPrice + market.maxPrice) / 2n;
 const avgRate = (market.minRate + market.maxRate) / 2n;
 const healthStatus = getHealthColor(
 market.collateralRatio,
 market.rebalanceThreshold
 );

 const tokenPrices = tokenPricesByMarket[market.marketId];

  const marketCfg = (marketsConfig as any)?.[market.marketId];
  const collateralHeldSymbol: string =
    marketCfg?.collateral?.symbol || marketCfg?.collateral?.underlyingSymbol || "";

  // Prepare pool data for APR calculation
  const poolDataForAPR = useMemo(() => {
    return pools.map((pool) => ({
      address: pool.address,
      poolType: pool.type === "collateral" ? "collateral" as const : "sail" as const,
      marketId: market.marketId,
      peggedTokenPrice: market.peggedTokenPrice,
      collateralPrice: avgPrice, // Using avgPrice from oracle
      collateralPriceDecimals: 18,
      peggedTokenAddress: market.peggedTokenAddress,
      collateralTokenAddress: marketCfg?.addresses?.wrappedCollateralToken as `0x${string}` | undefined,
    }));
  }, [pools, market.marketId, market.peggedTokenPrice, market.peggedTokenAddress, avgPrice, marketCfg]);

  // Calculate APR for pools (using dummy address since we only need APR, not claimable rewards)
  const { data: poolRewardsData = [] } = useAllStabilityPoolRewards({
    pools: poolDataForAPR,
    ethPrice: ethPrice ?? undefined,
    btcPrice: btcPrice ?? undefined,
    peggedPriceUSDMap: tokenPrices?.peggedPriceUSD 
      ? { [market.marketId]: BigInt(Math.floor(tokenPrices.peggedPriceUSD * 1e18)) }
      : undefined,
    enabled: isExpanded && poolDataForAPR.length > 0,
    overrideAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Dummy address for transparency page
  });

  // Create a map of pool address -> APR
  const poolAPRMap = useMemo(() => {
    const map = new Map<string, number>();
    poolRewardsData.forEach((reward) => {
      map.set(reward.poolAddress.toLowerCase(), reward.totalRewardAPR);
    });
    return map;
  }, [poolRewardsData]);

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
 <div className="bg-white p-2.5 space-y-2">
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
 {formatTokenBalanceMax2Decimals(market.leveragedTokenBalance)}
 </div>
 </div>
 </div>
 </div>
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
 const poolTokenPriceUSD =
  pool.type === "collateral"
    ? tokenPrices?.peggedPriceUSD ?? 0
    : tokenPrices?.leveragedPriceUSD ?? 0;
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
   const apr = poolAPRMap.get(pool.address.toLowerCase());
   return apr !== undefined && apr > 0 ? `${apr.toFixed(2)}%` : "-";
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
 <span className="text-white/40 text-[10px]">
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

