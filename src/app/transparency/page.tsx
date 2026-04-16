"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";

import {
 useTransparencyData,
 formatCollateralRatio,
 formatLeverageRatio,
 getHealthColor,
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
 XMarkIcon,
} from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import InfoTooltip from "@/components/InfoTooltip";
import { InfinityOutlineIcon } from "@/components/icons/InfinityOutlineIcon";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { isMarketInMaintenance, markets as marketsConfig } from "@/config/markets";
import { MarketMaintenanceBadge } from "@/components/MarketMaintenanceTag";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useMultipleVolatilityProtection } from "@/hooks/useVolatilityProtection";
import { useReadContract, useAccount } from "wagmi";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";
import {
  INDEX_HERO_INTRO_BODY_CLASS,
  INDEX_HERO_INTRO_CARD_CLASS,
  INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS,
  INDEX_HERO_INTRO_ICON_CLASS,
  INDEX_HERO_INTRO_TITLE_CLASS,
  INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";
import { minterABI } from "@/abis/minter";

const SCROLLBAR_HIDE_X =
  "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
import Image from "next/image";
import { getLogoPath } from "@/lib/logos";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";
import {Cell, ResponsiveContainer, Tooltip, BarChart, XAxis, YAxis, Bar} from "recharts";

type FeeBand = {
    lowerBound: bigint;
    upperBound?: bigint;
    ratio: bigint;
};

type FeeVariant = "blocked" | "free" | "discount" | "fee" ;
type HealthStatus = "green" | "yellow" | "red";
type WithdrawalStatus = "none" | "waiting" | "open" | "expired";

type BadgeVariantConfig = {
    label: string;
    bg: string;      // background color classes
    text: string;    // text color classes
    icon?: React.ElementType; // optional icon component
    size?: "sm" | "md";      // optional size
};

const FEE_CONFIG: Record<FeeVariant, BadgeVariantConfig> = {
    blocked: {
        label: "Blocked",
        bg: "bg-red-500/30",
        text: "text-red-700",
    },
    free: {
        label: "Free",
        bg: "bg-blue-500/30",
        text: "text-blue-700",
    },
    discount: {
        label: "",
        bg: "bg-green-500/30",
        text: "text-green-700",
    },
    fee: {
        label: "",
        bg: "bg-orange-500/30",
        text: "text-orange-700",
    },
};

const HEALTH_CONFIG: Record<HealthStatus, BadgeVariantConfig> = {
    green: {
        label: "Healthy",
        bg: "bg-green-500/20",
        text: "text-green-700",
        icon: ShieldCheckIcon,
    },
    yellow: {
        label: "Warning",
        bg: "bg-yellow-500/20",
        text: "text-yellow-700",
        icon: ExclamationTriangleIcon,
    },
    red: {
        label: "Critical",
        bg: "bg-red-500/20",
        text: "text-red-700",
        icon: XCircleIcon,
    },
};

const WITHDRAWAL_CONFIG: Record<WithdrawalStatus, BadgeVariantConfig> = {
    none: {
        bg: "bg-white/10",
        text: "text-white/40",
        label: "None",
        icon: ClockIcon
    },
    waiting: {
        bg: "bg-blue-500/20",
        text: "text-blue-400",
        label: "Waiting",
        icon: ClockIcon
    },
    open: {
        bg: "bg-harbor-mint/20",
        text: "text-harbor-mint",
        label: "Open",
        icon: ClockIcon
    },
    expired: {
        bg: "bg-harbor-coral/20",
        text: "text-harbor-coral",
        label: "Expired",
        icon: ClockIcon
    },
};

const EMPTY_BANDS: Record<string, FeeBand[]> = {
    mintPegged: [],
    mintLeveraged: [],
    redeemPegged: [],
    redeemLeveraged: [],
};

const WAD = 10n ** 18n;
const COLLATERAL_RATIO_INFINITY_THRESHOLD_PERCENT = 10_000;
const COLLATERAL_RATIO_INFINITY_TOOLTIP = "Collateral ratio very high.";

const usdFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatUSD(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return "-";
    return `$${usdFormatter.format(value)}`;
}

function getCollateralRatioDisplay(ratio: bigint): {
    value: string;
    showInfinityTooltip: boolean;
} {
    const percentage = Number(ratio) / 1e16;
    if (
        !Number.isFinite(percentage) ||
        percentage >= COLLATERAL_RATIO_INFINITY_THRESHOLD_PERCENT
    ) {
        return { value: "∞", showInfinityTooltip: true };
    }

    return {
        value: formatCollateralRatio(ratio),
        showInfinityTooltip: false,
    };
}

function CollateralRatioDisplay({
    ratio,
    className = "",
}: {
    ratio: bigint;
    className?: string;
}) {
    const { value, showInfinityTooltip } = getCollateralRatioDisplay(ratio);

    if (!showInfinityTooltip) {
        return <span className={className}>{value}</span>;
    }

    return (
        <InfoTooltip side="top" label={COLLATERAL_RATIO_INFINITY_TOOLTIP}>
            <span
                className={`inline-flex items-center justify-center cursor-help ${className}`}
                role="img"
                aria-label={COLLATERAL_RATIO_INFINITY_TOOLTIP}
            >
                <InfinityOutlineIcon
                    className="h-[1.65em] w-[1.65em] min-h-[18px] min-w-[18px] text-current"
                    strokeWidth={2}
                />
            </span>
        </InfoTooltip>
    );
}

function formatTokenBalanceMax2Decimals(balance: bigint, decimals: number = 18): string {
  if (balance === 0n) return "0";
  const num = Number(balance) / 10 ** decimals;
  if (num < 0.01) return "<0.01";
  if (num < 1000) return num.toFixed(2).replace(/\.?0+$/, "");
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

function bandsFromConfig(config: any): FeeBand[] {
    if (!config) return [];

    const bounds: bigint[] = config.collateralRatioBandUpperBounds ?? [];
    const ratios: bigint[] = config.incentiveRatios ?? config.incentiveRates ?? [];

    if (!Array.isArray(ratios) || ratios.length === 0) return [];

    const bands: FeeBand[] = [];
    let lower = 0n;

    for (let i = 0; i < ratios.length; i++) {
        const upper = i < bounds.length ? bounds[i] : undefined;
        bands.push({ lowerBound: lower, upperBound: upper, ratio: ratios[i] });
        if (upper !== undefined) lower = upper;
    }

    return bands;
}

export function Badge({
                          config,
                          size = "md",
                      }: {
    config: BadgeVariantConfig;
    size?: "sm" | "md";
}) {
    const { label, bg, text, icon: Icon } = config;

    const sizeClasses =
        size === "sm"
            ? "px-2 py-0.5 text-[10px] gap-1 rounded-md"
            : "px-2 py-0.5 text-xs gap-1 rounded-full";

    const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

    return (
        <span
            className={`inline-flex items-center font-medium ${sizeClasses} ${bg} ${text}`}
        >
      {Icon && <Icon className={iconSize} />}
            {label}
    </span>
    );
}

type MarketCardProps = {
    market: any;
    pools: any[];
    userPools: any;
    tokenPricesByMarket: any;
    volatilityProtectionMap: any;
    fxSAVEPrice?: number;
    wstETHPrice?: number;
    stETHPrice?: number;
    btcPrice?: number;
    ethPrice?: number;
    poolRewardsMap: Map<string, any>;
    /** True while pool APR query has not returned data yet (avoid showing "-" during load). */
    poolRewardsAprPending?: boolean;
};

function MarketCard({
                               market,
                               pools,
                               userPools,
                               tokenPricesByMarket,
                               volatilityProtectionMap,
                               fxSAVEPrice,
                               wstETHPrice,
                               stETHPrice,
                               btcPrice,
                               ethPrice,
                               poolRewardsMap,
                               poolRewardsAprPending = false,
                           }: MarketCardProps) {
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
    const showMaintenanceTag = isMarketInMaintenance(marketCfg);
    const peggedTokenSymbol = marketCfg?.peggedToken?.symbol || "haETH";
    const leveragedTokenSymbol = marketCfg?.leveragedToken?.symbol || "hsFXUSD-ETH";
    const collateralHeldSymbol: string =
        marketCfg?.collateral?.symbol || marketCfg?.collateral?.underlyingSymbol || "";

    const minterAddress =
        (market.minterAddress as `0x${string}` | undefined) ??
        (marketCfg?.addresses?.minter as `0x${string}` | undefined);
    const volatilityProtection = minterAddress
        ? volatilityProtectionMap.get(minterAddress.toLowerCase())?.protection ?? "-"
        : "-";

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
                name: "Collateral SP",
                value: Number(collateralPoolTVL) / 1e18,
                rawValue: collateralPoolTVL,
            });
        }
        if (sailPoolTVL > 0n) {
            data.push({
                name: "Sail SP",
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

    const BAR_CHART_CATEGORY_COLORS: Record<string, string> = {
        "Not Deposited": "#1E4775",
        "Collateral SP": "#9ED5BE",
        "Sail SP": "#FF8A7A",
        "Sail Supply": "#E9C46A",
    };

    const barChartTotalValue = distributionData.reduce((sum, item) => sum + item.value, 0);

    const barchartPercentData = distributionData.map((item) => ({
        name: item.name,
        value: (item.value / barChartTotalValue) * 100, // percent for the bar
    }));

    const barChartMaxPercent = Math.max(...barchartPercentData.map((d) => d.value));

    return (
        <div className="rounded-md border border-[#1E4775]/15 bg-white shadow-sm overflow-hidden">
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
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="text-[#1E4775] font-semibold text-sm truncate">
                                    {market.marketName}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {showMaintenanceTag ? (
                                    <MarketMaintenanceBadge compact/>
                                ) : (
                                    <HealthBadge status={healthStatus} compact/>
                                )}
                                {isExpanded ? (
                                    <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0"/>
                                ) : (
                                    <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0"/>
                                )}
                            </div>
                        </div>

                        <div
                            className="grid grid-cols-[1.15fr_0.65fr_1.65fr_0.95fr_0.95fr] gap-x-2 gap-y-0 text-[10px]">
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
                                    Collateral Ratio
                                </div>
                                <div
                                    className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
                                    <CollateralRatioDisplay ratio={market.collateralRatio} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
                                    Leverage
                                </div>
                                <div
                                    className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
                                    {formatLeverageRatio(market.leverageRatio)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap">
                                    TVL
                                </div>
                                <div
                                    className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap flex items-baseline gap-1">
                                    <span className="whitespace-nowrap">{formatCompactUSD(totalTVLUSD)}</span>
                                    {collateralHeldWrapped > 0n && (
                                        <span
                                            className="text-[#1E4775]/60 text-[10px] whitespace-nowrap align-bottom">
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
                                <div
                                    className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
                                    {formatCollateralRatio(market.rebalanceThreshold)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 items-end text-right">
                                <div
                                    className="text-[#1E4775]/60 font-semibold text-[9px] whitespace-nowrap flex items-center justify-end gap-1">
                                    Vol. Prot.
                                    <InfoTooltip
                                        side="top"
                                        label={
                                            <div className="space-y-2">
                                                <p className="font-semibold mb-1">Volatility Protection</p>
                                                <p>
                                                    The percentage adverse price movement between collateral and the
                                                    pegged token that the system can withstand before reaching the
                                                    depeg point (100% collateral ratio).
                                                </p>
                                                <p>
                                                    For example, an ETH-pegged token with USD collateral is
                                                    protected
                                                    against ETH price spikes (ETH becoming more expensive relative
                                                    to
                                                    USD).
                                                </p>
                                                <p>
                                                    This accounts for stability pools that can rebalance and improve
                                                    the collateral ratio during adverse price movements.
                                                </p>
                                                <p className="text-xs text-gray-400 italic">
                                                    Higher percentage = more protection. Assumes no additional
                                                    deposits
                                                    or withdrawals.
                                                </p>
                                            </div>
                                        }
                                    >
                                        <span className="text-[#1E4775]/70 cursor-help">[?]</span>
                                    </InfoTooltip>
                                </div>
                                <div
                                    className="text-[#1E4775] font-mono font-semibold text-[11px] whitespace-nowrap">
                                    {volatilityProtection}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="hidden lg:grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center text-sm">
                        {/* Market Name */}
                        <div className="whitespace-nowrap min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <div className="text-[#1E4775] font-semibold text-sm">
                                    {market.marketName}
                                </div>
                                {isExpanded ? (
                                    <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0"/>
                                ) : (
                                    <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0"/>
                                )}
                            </div>
                        </div>

                        {/* Collateral Ratio */}
                        <div className="text-center">
                            <div className="text-[#1E4775] font-mono text-sm font-semibold">
                                <CollateralRatioDisplay ratio={market.collateralRatio} />
                            </div>
                        </div>

                        {/* Leverage Ratio */}
                        <div className="text-center">
                            <div className="text-[#1E4775] font-mono text-sm font-semibold">
                                {formatLeverageRatio(market.leverageRatio)}
                            </div>
                        </div>

                        {/* Volatility Protection */}
                        <div className="text-center">
                            <div className="text-[#1E4775] font-mono text-sm font-semibold">
                                {volatilityProtection}
                            </div>
                        </div>

                        {/* TVL */}
                        <div className="text-center">
                            <div
                                className="text-[#1E4775] font-mono text-sm font-semibold whitespace-nowrap inline-flex items-baseline gap-1">
                                {formatCompactUSD(totalTVLUSD)}
                                {collateralHeldWrapped > 0n && (
                                    <span className="text-[#1E4775]/60 text-xs whitespace-nowrap">
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
                            {showMaintenanceTag ? (
                                <MarketMaintenanceBadge compact/>
                            ) : (
                                <HealthBadge status={healthStatus} compact/>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="bg-[rgb(var(--surface-selected-rgb))] border-t border-[#1E4775]/10 p-3">
                    {/* Fees & Incentives (bands) */}
                    <div className="mb-3">
                        <FeeTransparencyBands
                            minterAddress={market.minterAddress}
                            currentCR={market.collateralRatio}
                            chainId={market.chainId}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Token Prices & Supply */}
                        <div className="bg-white p-2.5 space-y-2 lg:row-span-2 rounded-xl border border-[#1E4775]/10">
                            <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
                                Prices & Supply
                            </h4>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                    <div className="text-[#1E4775]/60 text-[9px]">
                                        Anchor Price
                                    </div>
                                    <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                        {tokenPrices?.peggedPriceUSD && tokenPrices.peggedPriceUSD > 0
                                            ? formatUSD(tokenPrices.peggedPriceUSD)
                                            : "-"}
                                    </div>
                                </div>
                                <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                    <div className="text-[#1E4775]/60 text-[9px]">
                                        Sail Price
                                    </div>
                                    <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                        {tokenPrices?.leveragedPriceUSD && tokenPrices.leveragedPriceUSD > 0
                                            ? formatUSD(tokenPrices.leveragedPriceUSD)
                                            : "-"}
                                    </div>
                                </div>
                                <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                    <div className="text-[#1E4775]/60 text-[9px]">
                                        Anchor Supply
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                        <Image
                                            src={getLogoPath(peggedTokenSymbol)}
                                            alt={peggedTokenSymbol}
                                            width={16}
                                            height={16}
                                            className="flex-shrink-0"
                                        />
                                        <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                            {formatTokenBalanceMax2Decimals(market.peggedTokenBalance)}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                    <div className="text-[#1E4775]/60 text-[9px]">
                                        Sail Supply
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                        <Image
                                            src={getLogoPath(leveragedTokenSymbol)}
                                            alt={leveragedTokenSymbol}
                                            width={16}
                                            height={16}
                                            className="flex-shrink-0"
                                        />
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
                                    <div className="w-full" style={{height: "220px"}}>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={barchartPercentData}
                                                      margin={{top: 20, right: 20, left: 0, bottom: 20}}>
                                                <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false}
                                                       tickLine={false}/>
                                                <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false}
                                                       width={30} unit="%"
                                                       domain={[0, Math.ceil(barChartMaxPercent / 10) * 10]}
                                                />

                                                <Tooltip
                                                    content={({active, payload}) => {
                                                        if (!active || !payload || payload.length === 0) return null;

                                                        const data = payload[0].payload;

                                                        return (
                                                            <div
                                                                style={{
                                                                    background: "white",
                                                                    padding: "4px 6px",
                                                                    border: "1px solid #ccc",
                                                                    fontSize: 10,
                                                                    color: "#1E4775",
                                                                    lineHeight: 1,           // remove extra line spacing
                                                                }}
                                                            >
                                                                <strong>{data.name}</strong>: {data.value.toFixed(1)}%
                                                            </div>
                                                        );
                                                    }}
                                                />

                                                <Bar dataKey="value">
                                                    {barchartPercentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`}
                                                              fill={BAR_CHART_CATEGORY_COLORS[entry.name]}/>
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stability Pools */}
                        <div className="bg-white p-2.5 space-y-2 lg:col-span-2 rounded-xl border border-[#1E4775]/10">
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
                                        : "none";

                                    return (
                                        <div key={pool.address} className="space-y-1.5">
                                            <div className="flex items-center gap-2">
 <span className="text-[#1E4775] font-semibold text-[10px] w-12">
 {pool.type === "collateral" ? "Anchor" : "Sail"}
 </span>
                                                <div className="grid grid-cols-5 gap-1.5 text-xs flex-1">
                                                    <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                        <div className="text-[#1E4775]/60 text-[9px]">Anchor Token
                                                            TVL
                                                        </div>
                                                        <div
                                                            className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                            {formatCompactUSD((Number(pool.tvl) / 1e18) * poolTokenPriceUSD)} ({formatTokenBalanceMax2Decimals(pool.tvl)} {peggedTokenSymbol})
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                        <div className="text-[#1E4775]/60 text-[9px]">APR</div>
                                                        <div
                                                            className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                            {(() => {
                                                                const poolReward = poolRewardsMap.get(
                                                                    pool.address.toLowerCase()
                                                                );
                                                                const apr = poolReward?.totalRewardAPR ?? 0;
                                                                if (apr > 0) return `${apr.toFixed(2)}%`;
                                                                if (poolRewardsAprPending) return "…";
                                                                return "—";
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                        <div className="text-[#1E4775]/60 text-[9px]">Early Fee
                                                        </div>
                                                        <div
                                                            className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                            {(Number(pool.earlyWithdrawalFee) / 1e16).toFixed(2)}%
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                        <div className="text-[#1E4775]/60 text-[9px]">Wait period
                                                        </div>
                                                        <div
                                                            className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                            {(Number(pool.withdrawWindow.startDelay) / 3600).toFixed(2)}h
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                        <div className="text-[#1E4775]/60 text-[9px]">Fee-free
                                                            duration
                                                        </div>
                                                        <div
                                                            className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                            {(Number(pool.withdrawWindow.endWindow) / 3600).toFixed(2)}h
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {userData && userData.assetBalance > 0n && (
                                                <div
                                                    className="pt-1.5 border-t border-[#1E4775]/10 flex items-center justify-between text-[10px]">
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
                                                        <WithdrawalStatusBadge status={withdrawStatus}/>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Yield (Anchor Supply) */}
                        <div className="bg-white p-2.5 space-y-2 lg:col-span-2 rounded-xl border border-[#1E4775]/10">
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
                                                const tokenSymbol = peggedTokenSymbol;

                                                const categories = [
                                                    {
                                                        name: "Not Deposited",
                                                        value: anchorNotDeposited,
                                                        color: "#1E4775"
                                                    },
                                                    {
                                                        name: "Collateral SP",
                                                        value: collateralPoolTVL,
                                                        color: "#9ED5BE"
                                                    },
                                                    {name: "Sail SP", value: sailPoolTVL, color: "#FF8A7A"},
                                                ];

                                                const notDepositedNum = Number(anchorNotDeposited) / 1e18;
                                                const collateralPoolNum = Number(collateralPoolTVL) / 1e18;
                                                const sailPoolNum = Number(sailPoolTVL) / 1e18;

                                                // Yield Generating Collateral: Full TVL (minter's total collateral) converted to wrapped collateral token
                                                // Use the minter's total collateral TVL (totalTVLUSD) and wrapped collateral amount
                                                const tvlYieldGeneratorUSD = totalTVLUSD; // Full minter TVL in USD
                                                // collateralTokensWrapped is already in token units (not wei), convert to wei for formatting
                                                const tvlYieldGeneratorWrappedTokenWei = BigInt(Math.floor(collateralTokensWrapped * 1e18));
                                                const wrappedCollateralSymbol = market.marketId?.toLowerCase().includes("fxusd") || market.marketId?.toLowerCase().includes("fx-usd") ? "fxSAVE" : "wstETH";

                                                return (
                                                    <>
                                                        {/* First box: Yield Generating Collateral */}
                                                        <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                            <div className="text-[#1E4775]/60 text-[9px]">Yield
                                                                Generating Collateral
                                                            </div>
                                                            <div
                                                                className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                                {formatCompactUSD(tvlYieldGeneratorUSD)}
                                                            </div>
                                                            <div
                                                                className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
                                                                {formatTokenBalanceMax2Decimals(tvlYieldGeneratorWrappedTokenWei)} {wrappedCollateralSymbol}
                                                            </div>
                                                        </div>

                                                        {/* Second box: Anchor Token TVL */}
                                                        <div className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                            <div className="text-[#1E4775]/60 text-[9px]">Anchor
                                                                Token TVL
                                                            </div>
                                                            <div
                                                                className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                                {formatCompactUSD(totalTVL)}
                                                            </div>
                                                            <div
                                                                className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
                                                                {formatTokenBalanceMax2Decimals(anchorSupply)} {tokenSymbol}
                                                            </div>
                                                        </div>

                                                        {/* Three category boxes */}
                                                        {categories.map((category) => {
                                                            const valueNum = Number(category.value) / 1e18;
                                                            const usdValue = valueNum * poolTokenPriceUSD;
                                                            const totalForCat = notDepositedNum + collateralPoolNum + sailPoolNum;
                                                            const percent = totalForCat > 0 ? ((valueNum / totalForCat) * 100).toFixed(1) : "0.0";

                                                            return (
                                                                <div key={category.name}
                                                                     className="bg-[#1E4775]/5 p-1.5 text-center rounded-lg">
                                                                    <div
                                                                        className="text-[#1E4775]/60 text-[9px]">{category.name}</div>
                                                                    <div
                                                                        className="text-[#1E4775] font-mono font-semibold text-[10px]">
                                                                        {formatCompactUSD(usdValue)}
                                                                    </div>
                                                                    <div
                                                                        className="text-[#1E4775]/70 font-mono text-[9px] mt-0.5">
                                                                        {formatTokenBalanceMax2Decimals(category.value)} {tokenSymbol}
                                                                    </div>
                                                                    <div
                                                                        className="text-[#1E4775]/60 font-mono text-[9px]">
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

                                        // Normalize percentages so bar sums to 100% (pool TVLs can exceed anchor supply in edge cases)
                                        const totalForBar = notDepositedNum + collateralPoolNum + sailPoolNum;
                                        const notDepositedPercent = totalForBar > 0 ? (notDepositedNum / totalForBar) * 100 : 0;
                                        const collateralPoolPercent = totalForBar > 0 ? (collateralPoolNum / totalForBar) * 100 : 0;
                                        const sailPoolPercent = totalForBar > 0 ? (sailPoolNum / totalForBar) * 100 : 0;

                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="w-12"></div>
                                                <div className="flex-1 space-y-1">
                                                    {/* Yield/No Yield indicator above bar */}
                                                    <div
                                                        className="relative flex items-center text-[8px] text-[#1E4775]/60 px-1"
                                                        style={{height: '14px'}}>
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

                                                    {/* Bar container: inner clip for rounded track; pipe outside clip */}
                                                    <div className="relative h-4">
                                                        <div className="absolute inset-0 rounded-md overflow-hidden bg-[#1E4775]/10">
                                                            {notDepositedPercent > 0 && (
                                                                <div
                                                                    className="absolute top-0 bottom-0 bg-[#1E4775] rounded-l-md"
                                                                    style={{
                                                                        left: "0%",
                                                                        width: `${notDepositedPercent}%`,
                                                                    }}
                                                                />
                                                            )}
                                                            {collateralPoolPercent > 0 && (
                                                                <div
                                                                    className="absolute top-0 bottom-0"
                                                                    style={{
                                                                        backgroundColor: "#9ED5BE",
                                                                        left: `${notDepositedPercent}%`,
                                                                        width: `${collateralPoolPercent}%`,
                                                                    }}
                                                                />
                                                            )}
                                                            {sailPoolPercent > 0 && (
                                                                <div
                                                                    className="absolute top-0 bottom-0 bg-[#FF8A7A] rounded-r-md"
                                                                    style={{
                                                                        left: `${notDepositedPercent + collateralPoolPercent}%`,
                                                                        width: `${sailPoolPercent}%`,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div
                                                            className="absolute w-0.5 bg-red-500 z-10 pointer-events-none rounded-full"
                                                            style={{
                                                                left: `${notDepositedPercent}%`,
                                                                top: "-10px",
                                                                bottom: "-10px",
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Pool names below bar - aligned with segments */}
                                                    <div className="relative flex text-[8px] text-[#1E4775] px-1"
                                                         style={{height: '16px'}}>
                                                        <div
                                                            className="absolute text-center"
                                                            style={{left: '0%', width: `${notDepositedPercent}%`}}
                                                        >
                                                            Not Deposited
                                                        </div>
                                                        <div
                                                            className="absolute text-center"
                                                            style={{
                                                                left: `${notDepositedPercent}%`,
                                                                width: `${collateralPoolPercent}%`
                                                            }}
                                                        >
                                                            Collateral SP
                                                        </div>
                                                        <div
                                                            className="absolute text-center"
                                                            style={{
                                                                left: `${notDepositedPercent + collateralPoolPercent}%`,
                                                                width: `${sailPoolPercent}%`
                                                            }}
                                                        >
                                                            Sail SP
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
                    <div className="mt-3 bg-white p-3 rounded-xl border border-[#1E4775]/10">
                        <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
                            Contract Addresses
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {[
                                {label: "Minter", address: market.minterAddress},
                                {label: "Anchor Token", address: market.peggedTokenAddress},
                                {label: "Sail Token", address: market.leveragedTokenAddress},
                                {label: "Oracle", address: market.priceOracleAddress},
                                {label: "Fee Receiver", address: market.feeReceiverAddress},
                                {label: "Reserve Pool", address: market.reservePoolAddress},
                                {
                                    label: "Pool Manager",
                                    address: market.stabilityPoolManagerAddress,
                                },
                                ...pools.map((pool) => ({
                                    label: pool.name,
                                    address: pool.address,
                                })),
                            ].map(({label, address}) => (
                                <ContractAddressItem key={label} label={label} address={address}/>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatBandRange(b: FeeBand): string {
    return b.upperBound
        ? `${formatCollateralRatio(b.lowerBound)} – ${formatCollateralRatio(b.upperBound)}`
        : `> ${formatCollateralRatio(b.lowerBound)}`;
}

function FeeBandBadge({
                                 ratio,
                                 isMintSail = false,
                                 lowerBound = 0n,
                                 upperBound,
                             }: {
    ratio: bigint;
    isMintSail?: boolean;
    lowerBound?: bigint;
    upperBound?: bigint;
}) {
    const isBlocked = ratio >= WAD;
    const isFree = ratio === 0n;
    const isDiscount = ratio < 0n;

    const pct = Number(ratio) / 1e16;

    const isZeroToHundredRange = lowerBound === 0n && upperBound !== undefined;
    const tolerance = 10n ** 14n;
    const is100PercentOrClose = ratio >= (WAD - tolerance) && ratio <= WAD;

    const shouldBlockMintSail =
        isMintSail && isZeroToHundredRange && is100PercentOrClose;

    const finalIsBlocked = isBlocked || shouldBlockMintSail;

    const variant: FeeVariant = finalIsBlocked
        ? "blocked"
        : isFree
            ? "free"
            : isDiscount
                ? "discount"
                : "fee";

    const config = { ...FEE_CONFIG[variant] };

    if (!finalIsBlocked && !isFree) {
        config.label = `${pct.toFixed(2)}% ${isDiscount ? "discount" : "fee"}`;
    }

    return <Badge config={config} size="sm" />;
}

function BandTable({
                       title,
                       bands,
                       currentCR,
                   }: {
    title: string;
    bands: FeeBand[];
    currentCR: bigint;
}) {
    return (
        <div className="bg-white p-3 rounded-xl border border-[#1E4775]/10">
            <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                {title}
            </h5>

            {bands.length === 0 ? (
                <div className="text-[10px] text-[#1E4775]/60">Loading…</div>
            ) : (
                <div className="space-y-1">
                    {bands.map((b, idx) => {
                        const active =
                            currentCR >= b.lowerBound &&
                            (b.upperBound === undefined || currentCR <= b.upperBound);

                        const isMintSail = title === "Mint Sail";

                        return (
                            <div
                                key={idx}
                                className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg ${
                                    active
                                        ? "bg-[#1E4775]/10 border border-[#1E4775]/30"
                                        : "bg-[#1E4775]/5"
                                }`}
                            >
                <span className="text-[#1E4775]/70 font-mono">
                  {formatBandRange(b)}
                </span>

                                <FeeBandBadge
                                    ratio={b.ratio}
                                    isMintSail={isMintSail}
                                    lowerBound={b.lowerBound}
                                    upperBound={b.upperBound}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function FeeTransparencyBands({
                                  minterAddress,
                                  currentCR,
                                  chainId,
                              }: {
    minterAddress: `0x${string}`;
    currentCR: bigint;
    /** Chain the minter lives on — must match wallet-agnostic transparency reads. */
    chainId: number;
}) {
    const { data: configData } = useReadContract({
        address: minterAddress,
        abi: minterABI,
        functionName: "config",
        chainId,
    });

    const feeBands = useMemo(() => {
        if (!configData) return EMPTY_BANDS;

        const cfg = configData as any;

        return {
            mintPegged: bandsFromConfig(cfg.mintPeggedIncentiveConfig),
            mintLeveraged: bandsFromConfig(cfg.mintLeveragedIncentiveConfig),
            redeemPegged: bandsFromConfig(cfg.redeemPeggedIncentiveConfig),
            redeemLeveraged: bandsFromConfig(cfg.redeemLeveragedIncentiveConfig),
        };
    }, [configData]);

    return (
        <div className="bg-white p-3 rounded-xl border border-[#1E4775]/10">
            <h4 className="text-[#1E4775] font-semibold text-xs uppercase tracking-wider mb-2">
                Fees & Incentives
            </h4>

            <div className="text-[10px] text-[#1E4775]/60 mb-2">
                Current CR:{" "}
                <span className="font-mono font-semibold">
          <CollateralRatioDisplay ratio={currentCR} />
        </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <BandTable title="Mint Anchor" bands={feeBands.mintPegged} currentCR={currentCR} />
                <BandTable title="Mint Sail" bands={feeBands.mintLeveraged} currentCR={currentCR} />
                <BandTable title="Redeem Anchor" bands={feeBands.redeemPegged} currentCR={currentCR} />
                <BandTable title="Redeem Sail" bands={feeBands.redeemLeveraged} currentCR={currentCR} />
            </div>
        </div>
    );
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function ContractAddressItem({ label, address }: { label: string; address: string }) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<number | undefined>(undefined);

    const normalized = (address || "").trim();
    const hasAddress =
        normalized.startsWith("0x") &&
        normalized.length >= 10 &&
        normalized.toLowerCase() !== ZERO_ADDRESS.toLowerCase();

    const truncated = hasAddress
        ? `${normalized.slice(0, 6)}…${normalized.slice(-4)}`
        : "—";
    const etherscanUrl = `https://etherscan.io/address/${normalized}`;

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasAddress) return;
        try {
            await navigator.clipboard.writeText(normalized);
            setCopied(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col gap-1 py-2 px-2.5 bg-[#1E4775]/5 rounded-lg border border-[#1E4775]/10 text-center">
            <span className="text-[#1E4775]/70 text-[10px] font-medium">{label}</span>

            <div className="flex items-center justify-center gap-1 min-h-[1.25rem] text-[#1E4775]">
                {hasAddress ? (
                    <>
                        <button
                            type="button"
                            onClick={handleCopy}
                            title={copied ? "Copied" : "Copy address"}
                            className="rounded-md px-1 py-0.5 hover:bg-[#1E4775]/10 transition-colors"
                        >
                            <code className="font-mono text-[10px] text-[#1E4775]">{truncated}</code>
                        </button>
                        <a
                            href={etherscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1E4775] hover:text-[#163a61] shrink-0 p-0.5 rounded-md hover:bg-[#1E4775]/10 transition-colors"
                            aria-label={`View ${label} on Etherscan`}
                        >
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </a>
                    </>
                ) : (
                    <span className="font-mono text-[10px] text-[#1E4775]/45">—</span>
                )}
            </div>
        </div>
    );
}


function HealthBadge({
                         status,
                         compact = false,
                     }: {
    status: HealthStatus;
    compact?: boolean;
}) {
    return <Badge config={HEALTH_CONFIG[status]} size={compact ? "sm" : "md"} />;
}


function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
    return <Badge config={WITHDRAWAL_CONFIG[status]} size="sm" />;
}


export default function TransparencyPage() {
 const { isBasic: isBasicLayout } = usePageLayoutPreference();
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
        const {price: fxSAVEPrice} = useCoinGeckoPrice("fx-usd-saving");
        const {price: fxUSDPrice} = useCoinGeckoPrice("f-x-protocol-fxusd");
        const {price: wstETHPrice} = useCoinGeckoPrice("wrapped-steth");
        const {price: stETHPrice} = useCoinGeckoPrice("lido-staked-ethereum-steth");
        const {price: btcPrice} = useCoinGeckoPrice("bitcoin", 120000);
        const {price: ethPrice} = useCoinGeckoPrice("ethereum", 120000);

        const finishedMarkets = useMemo(
            () => markets.filter((m) => m.collateralTokenBalance > 0n),
            [markets]
        );

        const [chainFilterSelected, setChainFilterSelected] = useState<string[]>([]);

        const transparencyChainOptions = useMemo(() => {
            const seen = new Set<string>();
            const options: {
                id: string;
                label: string;
                iconUrl?: string;
                networkId?: string;
            }[] = [];
            markets.forEach((m) => {
                const cfg = (marketsConfig as any)[m.marketId];
                const name = cfg?.chain?.name || "Ethereum";
                if (seen.has(name)) return;
                seen.add(name);
                const logo = cfg?.chain?.logo || "icons/eth.png";
                const networkId = getWeb3iconsNetworkId(name);
                options.push({
                    id: name,
                    label: name,
                    iconUrl: networkId ? undefined : logo.startsWith("/") ? logo : `/${logo}`,
                    networkId,
                });
            });
            return options.sort((a, b) => a.label.localeCompare(b.label));
        }, [markets]);

        const displayedMarkets = useMemo(() => {
            if (chainFilterSelected.length === 0) return finishedMarkets;
            return finishedMarkets.filter((m) => {
                const cfg = (marketsConfig as any)[m.marketId];
                const name = cfg?.chain?.name || "Ethereum";
                return chainFilterSelected.includes(name);
            });
        }, [finishedMarkets, chainFilterSelected]);

        const clearChainFilters = useCallback(() => setChainFilterSelected([]), []);

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
        const {address: userAddress} = useAccount();

        const volatilityMarkets = useMemo(
            () =>
                finishedMarkets.map((m) => ({
                    minterAddress: m.minterAddress as `0x${string}` | undefined,
                    collateralPoolAddress: m.stabilityPoolCollateralAddress as
                        | `0x${string}`
                        | undefined,
                    sailPoolAddress: m.stabilityPoolLeveragedAddress as
                        | `0x${string}`
                        | undefined,
                })),
            [finishedMarkets]
        );
        const {data: volatilityProtectionMap} = useMultipleVolatilityProtection(
            volatilityMarkets,
            {
                enabled: finishedMarkets.length > 0,
                refetchInterval: 30000,
            }
        );

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
        const {
            data: allPoolRewards = [],
            isLoading: isPoolRewardsLoading,
            isFetching: isPoolRewardsFetching,
        } = useAllStabilityPoolRewards({
            pools: allPoolsForRewards,
            tokenPriceMap: globalTokenPriceMap, // Pass the token price map for reward token price lookup
            ethPrice: ethPrice ?? undefined,
            btcPrice: btcPrice ?? undefined,
            peggedPriceUSDMap: Object.keys(peggedPriceUSDMap).length > 0 ? peggedPriceUSDMap : undefined,
            enabled: finishedMarkets.length > 0 && allPoolsForRewards.length > 0,
            overrideAddress: userAddress || ("0x0000000000000000000000000000000000000000" as `0x${string}`), // Use user address if available, otherwise dummy
        });

        const poolRewardsAprPending =
            finishedMarkets.length > 0 &&
            allPoolsForRewards.length > 0 &&
            (isPoolRewardsLoading || (isPoolRewardsFetching && allPoolRewards.length === 0));

        // Create a map for quick lookup: poolAddress -> rewards (lowercase keys for checksum safety)
        const poolRewardsMap = useMemo(() => {
            const map = new Map<string, (typeof allPoolRewards)[0]>();
            allPoolRewards.forEach((poolReward) => {
                map.set(poolReward.poolAddress.toLowerCase(), poolReward);
            });
            return map;
        }, [allPoolRewards]);

        return (
            <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
                <main className="container mx-auto px-4 sm:px-10 pb-6 pt-2 sm:pt-4">
                    <div className="mb-2">
                        <IndexPageTitleSection
                            title="Transparency"
                            subtitle="Real-time protocol metrics from on-chain data"
                        />
                    </div>

                    {!isBasicLayout && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                            <div className={INDEX_HERO_INTRO_CARD_CLASS}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <EyeIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
                                    <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>
                                        Fully On-Chain
                                    </h2>
                                </div>
                                <p className={INDEX_HERO_INTRO_BODY_CLASS}>
                                    All data fetched directly from smart contracts
                                </p>
                            </div>
                            <div
                                className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS}`}
                            >
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <CurrencyDollarIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
                                    <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>
                                        Real-Time
                                    </h2>
                                </div>
                                <p className={INDEX_HERO_INTRO_BODY_CLASS}>
                                    Click refresh to update data
                                </p>
                            </div>
                            <div className={INDEX_HERO_INTRO_CARD_CLASS}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Squares2X2Icon className={INDEX_HERO_INTRO_ICON_CLASS} />
                                    <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>
                                        All Markets
                                    </h2>
                                </div>
                                <p className={INDEX_HERO_INTRO_BODY_CLASS}>
                                    View metrics for all Harbor markets
                                </p>
                            </div>
                        </div>
                    )}

                    <section
                        className="space-y-2 mt-2 sm:mt-3"
                        aria-label="Protocol markets"
                    >
                        <div className={INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                    Markets:
                                </h2>
                                {transparencyChainOptions.length > 0 && (
                                    <FilterMultiselectDropdown
                                        label="Network"
                                        options={transparencyChainOptions}
                                        value={chainFilterSelected}
                                        onChange={setChainFilterSelected}
                                        allLabel="All networks"
                                        groupLabel="NETWORKS"
                                        minWidthClass="min-w-[235px]"
                                    />
                                )}
                                {chainFilterSelected.length > 0 && (
                                    <SimpleTooltip label="clear filters">
                                        <button
                                            type="button"
                                            onClick={clearChainFilters}
                                            className="p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors"
                                            aria-label="clear filters"
                                        >
                                            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                                        </button>
                                    </SimpleTooltip>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:ml-auto">
                                <span
                                    className="text-white/40 text-[10px] max-w-[min(100%,14rem)] sm:max-w-none truncate sm:whitespace-normal"
                                    suppressHydrationWarning
                                    title={new Date(lastUpdatedTimestamp).toLocaleString()}
                                >
                                    Last updated: {new Date(lastUpdatedTimestamp).toLocaleString()}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    disabled={isLoading}
                                    className="flex shrink-0 items-center gap-1 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors disabled:opacity-50"
                                >
                                    <ArrowPathIcon
                                        className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                                    />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-3">
                                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            </div>
                        )}

                        {!isLoading && finishedMarkets.length === 0 ? (
                            <div className="rounded-lg border border-white/10 bg-black/[0.10] backdrop-blur-sm px-6 py-6 text-center">
                                <p className="text-white text-lg font-medium">
                                    Maiden Voyage in progress for Harbor&apos;s first markets - coming soon!
                                </p>
                            </div>
                        ) : (
                            <>
                                {!isLoading &&
                                    finishedMarkets.length > 0 &&
                                    displayedMarkets.length === 0 && (
                                        <div className="rounded-lg border border-white/10 bg-black/[0.10] backdrop-blur-sm px-4 py-6 text-center text-sm text-white/90">
                                            No markets match the selected network.{" "}
                                            <button
                                                type="button"
                                                onClick={clearChainFilters}
                                                className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
                                            >
                                                Clear filters
                                            </button>
                                        </div>
                                    )}
                                {displayedMarkets.length > 0 && (
                                    <div
                                        className={`hidden lg:block bg-white py-1.5 px-2 mb-0 overflow-x-auto rounded-md border border-[#1E4775]/15 shadow-sm ${SCROLLBAR_HIDE_X}`}
                                    >
                                        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                                            <div className="text-center">Market</div>
                                            <div className="text-center">Collateral Ratio</div>
                                            <div className="text-center">Leverage</div>
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Vol. Protection</span>
                                                <InfoTooltip
                                                    side="top"
                                                    label={
                                                        <div className="space-y-2">
                                                            <p className="font-semibold mb-1">Volatility Protection</p>
                                                            <p>
                                                                The percentage adverse price movement between collateral
                                                                and the pegged token that the system can withstand before
                                                                reaching the depeg point (100% collateral ratio).
                                                            </p>
                                                            <p>
                                                                For example, an ETH-pegged token with USD collateral is
                                                                protected against ETH price spikes (ETH becoming more
                                                                expensive relative to USD).
                                                            </p>
                                                            <p>
                                                                This accounts for stability pools that can rebalance and
                                                                improve the collateral ratio during adverse price
                                                                movements.
                                                            </p>
                                                            <p className="text-xs text-gray-400 italic">
                                                                Higher percentage = more protection. Assumes no
                                                                additional deposits or withdrawals.
                                                            </p>
                                                        </div>
                                                    }
                                                >
                                                    <span className="text-[#1E4775]/70 cursor-help">[?]</span>
                                                </InfoTooltip>
                                            </div>
                                            <div className="text-center">TVL (USD)</div>
                                            <div className="text-center">Threshold</div>
                                            <div className="text-center">Health</div>
                                        </div>
                                    </div>
                                )}

                                {isLoading && finishedMarkets.length === 0 ? (
                                    <div className="space-y-2">
                                        {[1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="animate-pulse h-14 rounded-md bg-white/10 border border-white/5"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {displayedMarkets.map((market) => (
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
                                                volatilityProtectionMap={volatilityProtectionMap}
                                                fxSAVEPrice={fxSAVEPrice}
                                                wstETHPrice={wstETHPrice}
                                                stETHPrice={stETHPrice}
                                                btcPrice={btcPrice || undefined}
                                                ethPrice={ethPrice || undefined}
                                                poolRewardsMap={poolRewardsMap}
                                                poolRewardsAprPending={poolRewardsAprPending}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </main>
            </div>
        );
    }

