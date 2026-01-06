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
} from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useReadContract } from "wagmi";
import { minterABI } from "@/abis/minter";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";

function formatUSD(value: number | undefined): string {
 if (value === undefined || !Number.isFinite(value)) return "-";
 return value.toLocaleString(undefined, {
   style: "currency",
   currency: "USD",
   minimumFractionDigits: 2,
   maximumFractionDigits: 6,
 });
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
 text:"text-green-400",
 icon: ShieldCheckIcon,
 label:"Healthy",
 },
 yellow: {
 bg:"bg-yellow-500/20",
 text:"text-yellow-400",
 icon: ExclamationTriangleIcon,
 label:"Warning",
 },
 red: {
 bg:"bg-red-500/20",
 text:"text-red-400",
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
 <div className="hidden lg:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center">
 {/* Market Name */}
 <div className="flex items-center gap-2">
 {isExpanded ? (
 <ChevronUpIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
 ) : (
 <ChevronDownIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
 )}
 <div>
 <div className="text-[#1E4775] font-semibold text-sm">
 {market.marketName}
 </div>
 <div className="text-[#1E4775]/50 text-[10px] font-mono">
 {market.marketId}
 </div>
 </div>
 </div>

 {/* Collateral Ratio */}
 <div className="text-center">
 <div className="text-[#1E4775] font-mono text-sm font-semibold">
 {formatCollateralRatio(market.collateralRatio)}
 </div>
 <div className="text-[#1E4775]/50 text-[10px]">CR</div>
 </div>

 {/* Leverage Ratio */}
 <div className="text-center">
 <div className="text-[#1E4775] font-mono text-sm font-semibold">
 {formatLeverageRatio(market.leverageRatio)}
 </div>
 <div className="text-[#1E4775]/50 text-[10px]">Leverage</div>
 </div>

 {/* TVL */}
 <div className="text-center">
 <div className="text-[#1E4775] font-mono text-sm font-semibold">
 {formatCompactUSD(totalTVLUSD)}
 </div>
 <div className="text-[#1E4775]/50 text-[10px]">TVL (USD)</div>
 </div>

 {/* Rebalance Threshold */}
 <div className="text-center">
 <div className="text-[#1E4775] font-mono text-sm font-semibold">
 {formatCollateralRatio(market.rebalanceThreshold)}
 </div>
 <div className="text-[#1E4775]/50 text-[10px]">Threshold</div>
 </div>

 {/* Health Status */}
 <div className="text-center">
 <HealthBadge status={healthStatus} compact />
 </div>

 {/* Expand Indicator */}
 <div className="flex items-center justify-center">
 {isExpanded ? (
 <ChevronUpIcon className="w-4 h-4 text-[#1E4775]" />
 ) : (
 <ChevronDownIcon className="w-4 h-4 text-[#1E4775]" />
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Expanded Content */}
 {isExpanded && (
 <div className="bg-[rgb(var(--surface-selected-rgb))] border-t border-[#1E4775]/10 p-3">
 {/* Fees & Incentives (compact overview) */}
 <div className="bg-white p-3 mb-3">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Fees & Incentives
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
 <div className="flex items-center justify-between text-xs bg-[#1E4775]/5 p-2">
 <span className="text-[#1E4775]/70">Mint Anchor</span>
 <FeeBadge ratio={market.mintPeggedIncentiveRatio} />
 </div>
 <div className="flex items-center justify-between text-xs bg-[#1E4775]/5 p-2">
 <span className="text-[#1E4775]/70">Mint Sail</span>
 <FeeBadge ratio={market.mintLeveragedIncentiveRatio} />
 </div>
 <div className="flex items-center justify-between text-xs bg-[#1E4775]/5 p-2">
 <span className="text-[#1E4775]/70">Redeem Anchor</span>
 <FeeBadge ratio={market.redeemPeggedIncentiveRatio} />
 </div>
 <div className="flex items-center justify-between text-xs bg-[#1E4775]/5 p-2">
 <span className="text-[#1E4775]/70">Redeem Sail</span>
 <FeeBadge ratio={market.redeemLeveragedIncentiveRatio} />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
 {/* Token Prices & Supply */}
 <div className="bg-white p-3 space-y-2">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Prices & Supply
 </h4>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Anchor Price
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {tokenPrices && tokenPrices.peggedPriceUSD > 0 ? formatUSD(tokenPrices.peggedPriceUSD) : "-"}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Sail Price
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {tokenPrices && tokenPrices.leveragedPriceUSD > 0 ? formatUSD(tokenPrices.leveragedPriceUSD) : "-"}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Anchor Supply
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {formatTokenBalance(market.peggedTokenBalance)}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Sail Supply
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {formatTokenBalance(market.leveragedTokenBalance)}
 </div>
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Collateral Held
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {formatTokenBalance(market.collateralTokenBalance)} wstETH
 </div>
 </div>
 </div>

 {/* Oracle & Threshold */}
 <div className="bg-white p-3 space-y-2">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Oracle & Rebalancing
 </h4>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">Min Price</div>
 <div className="text-[#1E4775] font-mono text-[11px]">
 {formatTokenPrice(market.minPrice)}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">Max Price</div>
 <div className="text-[#1E4775] font-mono text-[11px]">
 {formatTokenPrice(market.maxPrice)}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">Min Rate</div>
 <div className="text-[#1E4775] font-mono text-[11px]">
 {formatTokenPrice(market.minRate)}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">Max Rate</div>
 <div className="text-[#1E4775] font-mono text-[11px]">
 {formatTokenPrice(market.maxRate)}
 </div>
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="flex justify-between items-center">
 <span className="text-[#1E4775]/60 text-[10px]">
 Distance to Threshold
 </span>
 <span
 className={`font-mono text-xs font-semibold ${
 distanceToThreshold > 15
 ?"text-green-600"
 : distanceToThreshold > 5
 ?"text-yellow-600"
 :"text-red-600"
 }`}
 >
 {distanceToThreshold > 0 ?"+" :""}
 {distanceToThreshold.toFixed(1)}%
 </span>
 </div>
 </div>
 </div>

 </div>


 {/* Stability Pools */}
 <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
 <div key={pool.address} className="bg-white p-3">
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-[#1E4775] font-semibold text-xs">
 {pool.name}
 </h4>
 <span
 className={`text-[10px] px-1.5 py-0.5 ${
 pool.type ==="collateral"
 ?"bg-harbor-mint/30 text-[#1E4775]"
 :"bg-harbor-coral/30 text-[#1E4775]"
 }`}
 >
 {pool.type ==="collateral" ?"Anchor" :"Sail"}
 </span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-xs">
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">TVL (USD)</div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {formatCompactUSD((Number(pool.tvl) / 1e18) * poolTokenPriceUSD)}
 </div>
 <div className="text-[#1E4775]/50 text-[10px] mt-0.5">
 {formatTokenBalance(pool.tvl)}
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Early Fee
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {(Number(pool.earlyWithdrawalFee) / 1e16).toFixed(1)}%
 </div>
 </div>
 <div className="bg-[#1E4775]/5 p-2">
 <div className="text-[#1E4775]/60 text-[10px]">
 Window
 </div>
 <div className="text-[#1E4775] font-mono font-semibold">
 {Number(pool.withdrawWindow) / 3600}h
 </div>
 </div>
 </div>
 {userData && userData.assetBalance > 0n && (
 <div className="mt-2 pt-2 border-t border-[#1E4775]/10 flex items-center justify-between text-xs">
 <span className="text-[#1E4775]/70">Your Deposit</span>
 <span className="text-[#1E4775] font-mono font-semibold">
 {formatTokenBalance(userData.assetBalance)}
 </span>
 </div>
 )}
 {userData && userData.withdrawalRequest.amount > 0n && (
 <div className="mt-1 flex items-center justify-between text-xs">
 <span className="text-[#1E4775]/70">Withdrawal</span>
 <div className="flex items-center gap-2">
 <span className="text-[#1E4775] font-mono">
 {formatTokenBalance(
 userData.withdrawalRequest.amount
 )}
 </span>
 <WithdrawalStatusBadge status={withdrawStatus} />
 </div>
 </div>
 )}
 <div className="mt-2 pt-2 border-t border-[#1E4775]/10">
 <CopyButton text={pool.address} label="pool" />
 </div>
 </div>
 );
})}
 </div>

 {/* Contract Addresses */}
 <div className="mt-3 bg-white p-3">
 <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
 Contract Addresses
 </h4>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
 ].map(({ label, address }) => (
 <div
 key={label}
 className="flex items-center justify-between py-1.5 px-2 bg-[#1E4775]/5"
 >
 <span className="text-[#1E4775]/60 text-[10px]">{label}</span>
 <CopyButton text={address} label={label} />
 </div>
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

 // Fetch ha/hs token prices in USD (same approach as Sail page)
 const tokenPriceInputs = useMemo(() => {
   return markets
     .filter((m) => !!m.minterAddress)
     .map((m) => ({
       marketId: m.marketId,
       minterAddress: m.minterAddress,
       pegTarget: m.pegTarget,
     }));
 }, [markets]);
 const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative overflow-x-hidden">
 <main className="container mx-auto px-3 sm:px-4 lg:px-10 pb-6">
 {/* Header */}
 <div className="mb-2">
 {/* Title - Full Row */}
 <div className="p-4 flex items-center justify-center mb-0">
 <h1 className="font-bold font-mono text-white text-7xl text-center">
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
 {(() => {
   // Filter markets to only those with finished genesis (have collateral)
   const finishedMarkets = markets.filter(
     (market) => market.collateralTokenBalance > 0n
   );

   // If no markets have finished genesis, show banner
   if (!isLoading && finishedMarkets.length === 0) {
     return (
       <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
         <p className="text-white text-lg font-medium">
           Maiden Voyage in progress for Harbor's first markets - coming soon!
         </p>
       </div>
     );
   }

   // Otherwise, show markets as usual
   return (
     <>
       {/* Header Row - only show if there are finished markets */}
       {finishedMarkets.length > 0 && (
         <div className="bg-white p-2 mb-2">
           <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-bold">
             <div>Market</div>
             <div className="text-center">Collateral Ratio</div>
             <div className="text-center">Leverage</div>
            <div className="text-center">TVL (USD)</div>
             <div className="text-center">Threshold</div>
             <div className="text-center">Health</div>
             <div className="w-4"></div>
           </div>
         </div>
       )}

       {/* Loading state */}
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
               tokenPricesByMarket={tokenPricesByMarket}
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
   );
 })()}
 </main>
 </div>
 );
}
