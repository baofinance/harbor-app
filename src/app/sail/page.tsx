"use client";

import React, { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useContractRead } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { isMarketInMaintenance } from "@/config/markets";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { useSailPageData } from "@/hooks/useSailPageData";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import {
  getLongSide,
  getShortSide,
  parseLongSide,
  parseShortSide,
} from "@/utils/marketSideLabels";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="min-h-72 flex items-center justify-center text-[#1E4775]/60 text-sm">
      Loading chart…
    </div>
  ),
});
import SimpleTooltip from "@/components/SimpleTooltip";
import { getLogoPath } from "@/components/shared";
import { SailManageModal } from "@/components/SailManageModal";
import { WRAPPED_PRICE_ORACLE_ABI } from "@/abis/shared";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
  SailExtendedHero,
  SailLedgerMarksBar,
  SailMarksSubgraphErrorBanner,
  SailMarketsSections,
  SailMarketsTableHeader,
  SailPageTitleSection,
  SailUserStatsCards,
} from "@/components/sail";
import NetworkIconCell from "@/components/NetworkIconCell";
import { isBasicPageLayout } from "@/utils/pageLayoutView";

interface PnLData {
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  isLoading: boolean;
  error?: string;
}

const WAD = 10n ** 18n;
type FeeBand = {
  lowerBound: bigint;
  upperBound?: bigint;
  ratio: bigint;
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

function getCurrentFee(bands: FeeBand[] | undefined, currentCR?: bigint) {
  if (!bands || bands.length === 0 || !currentCR) return undefined;
  return (
    bands.find(
      (b) =>
        currentCR >= b.lowerBound &&
        (b.upperBound === undefined || currentCR <= b.upperBound)
    )?.ratio ?? bands[bands.length - 1]?.ratio
  );
}

/** Same band as `getCurrentFee` (for mint-sail block rules on current CR). */
function getActiveFeeBand(
  bands: FeeBand[] | undefined,
  currentCR?: bigint
): FeeBand | undefined {
  if (!bands || bands.length === 0 || !currentCR) return undefined;
  return (
    bands.find(
      (b) =>
        currentCR >= b.lowerBound &&
        (b.upperBound === undefined || currentCR <= b.upperBound)
    ) ?? bands[bands.length - 1]
  );
}

function FeeBandBadge({
  ratio,
  isMintSail = false,
  lowerBound = 0n,
  upperBound,
  showHelp = false,
}: {
  ratio: bigint;
  isMintSail?: boolean;
  lowerBound?: bigint;
  upperBound?: bigint;
  /** Table mint/redeem column: append [?] inside the tag (tooltip on parent). */
  showHelp?: boolean;
}) {
  const pct = Number(ratio) / 1e16;
  const isZeroToHundredRange = lowerBound === 0n && upperBound !== undefined;
  const tolerance = 10n ** 14n;
  const ratioAbs = ratio < 0n ? -ratio : ratio;
  const is100PercentOrClose = ratioAbs >= WAD - tolerance && ratioAbs <= WAD;
  const shouldBlockMintSail =
    isMintSail && isZeroToHundredRange && is100PercentOrClose;

  const isBlocked = ratio >= WAD || shouldBlockMintSail;
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
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap ${className}`}
    >
      {label}
      {showHelp ? (
        <span className="text-inherit font-semibold opacity-90">[?]</span>
      ) : null}
    </span>
  );
}

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
  maxFrac = 4,
  minFrac?: number
): string {
  if (!value) return "0";
  const n = Number(value) / 10 ** decimals;
  if (n > 0 && n < 1 / 10 ** maxFrac)
    return `<${(1 / 10 ** maxFrac).toFixed(maxFrac)}`;
  const min = minFrac ?? 0;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: maxFrac,
  });
}

function formatRatio(value: bigint | undefined): string {
  if (value === undefined) return "-";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

function formatLeverage(value: bigint | undefined): string {
  if (!value) return "-";
  const leverage = Number(value) / 1e18;
  return `${leverage.toFixed(2)}x`;
}

// Format PnL for display
function formatPnL(value: number): { text: string; color: string } {
  const isPositive = value >= 0;
  const sign = isPositive ? "+" : "-";
  const text = `${sign}$${Math.abs(value).toLocaleString(
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
const SailMarketRow = React.memo(function SailMarketRow({
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
  minterConfigData,
  rebalanceThresholdData,
}: {
  id: string;
  market: any;
  baseOffset: number;
  hasOracle: boolean;
  hasToken: boolean;
  reads: any;
  userDeposit: bigint | undefined;
  isExpanded: boolean;
  onToggleExpand: (marketId: string) => void;
  onManageClick: (marketId: string, m: any) => void;
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
  minterConfigData: unknown | undefined;
  rebalanceThresholdData: bigint | undefined;
}) {
  // Parse contract reads using dynamic offsets
  // Offsets: 0-3 = minter reads, 4 = oracle (if exists), 5-6 = token reads (if exists)
  const leverageRatio = reads?.[baseOffset]?.result as bigint | undefined;
  const collateralRatio = reads?.[baseOffset + 2]?.result as bigint | undefined;
  const collateralValue = reads?.[baseOffset + 3]?.result as bigint | undefined;

  const oracleOffset = 4;
  let fxSAVEPriceInETH: bigint | undefined;
  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  const priceOracleAddress = (market as any).addresses?.collateralPrice as
    | `0x${string}`
    | undefined;

  // Batched main reads include getPrice() for fxUSD; only call the dedicated read when batch has no result.
  const getPriceFromBatch =
    hasOracle && isFxUSDMarket
      ? (reads?.[baseOffset + 5]?.result as bigint | undefined)
      : undefined;

  const { data: fxSAVEPriceInETHDirect } = useContractRead({
    address: priceOracleAddress,
    abi: WRAPPED_PRICE_ORACLE_ABI,
    functionName: "getPrice",
    query: {
      enabled:
        isFxUSDMarket &&
        !!priceOracleAddress &&
        (getPriceFromBatch === undefined || getPriceFromBatch === null),
    },
  });

  const feeBands = useMemo(() => {
    if (!minterConfigData) return null;
    const cfg = minterConfigData as any;
    return {
      mintLeveraged: bandsFromConfig(cfg.mintLeveragedIncentiveConfig),
      redeemLeveraged: bandsFromConfig(cfg.redeemLeveragedIncentiveConfig),
    };
  }, [minterConfigData]);

  const mintFeeRatio = useMemo(
    () => getCurrentFee(feeBands?.mintLeveraged, collateralRatio),
    [feeBands, collateralRatio]
  );
  const redeemFeeRatio = useMemo(
    () => getCurrentFee(feeBands?.redeemLeveraged, collateralRatio),
    [feeBands, collateralRatio]
  );

  const activeMintBand = useMemo(
    () => getActiveFeeBand(feeBands?.mintLeveraged, collateralRatio),
    [feeBands, collateralRatio]
  );
  const activeRedeemBand = useMemo(
    () => getActiveFeeBand(feeBands?.redeemLeveraged, collateralRatio),
    [feeBands, collateralRatio]
  );

  if (hasOracle && isFxUSDMarket) {
    const getPriceRead = reads?.[baseOffset + oracleOffset + 1];
    if (getPriceRead?.result !== undefined && getPriceRead?.result !== null) {
      fxSAVEPriceInETH = getPriceRead.result as bigint;
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
  const shortSide = parseShortSide(tokenName, market);
  const longSide = parseLongSide(tokenName, market);
  const showMaintenance = isMarketInMaintenance(market);

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

  /** Mint/redeem column: same pill tags as fee popups (`FeeBandBadge`). */
  const renderFeeValue = (
    ratio: bigint | undefined,
    isMintSail: boolean,
    activeBand: FeeBand | undefined,
    showHelp = false
  ) => {
    if (ratio === undefined) {
      return (
        <span className="text-[#1E4775] font-medium text-[10px] font-mono">
          -
        </span>
      );
    }
    return (
      <FeeBandBadge
        ratio={ratio}
        isMintSail={isMintSail}
        lowerBound={activeBand?.lowerBound ?? 0n}
        upperBound={activeBand?.upperBound}
        showHelp={showHelp}
      />
    );
  };

  const renderFeeBands = (
    title: string,
    bands: FeeBand[] | undefined,
    isMintSail = false
  ) => {
    if (!bands || bands.length === 0) {
      return (
        <div className="bg-white p-2">
          <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
            {title}
          </h5>
          <div className="text-[10px] text-[#1E4775]/60">Loading…</div>
        </div>
      );
    }

    return (
      <div className="bg-white p-2">
        <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
          {title}
        </h5>
        <div className="space-y-1">
          {bands.map((b, idx) => {
            const active =
              collateralRatio &&
              collateralRatio >= b.lowerBound &&
              (b.upperBound === undefined || collateralRatio <= b.upperBound);
            const range = b.upperBound
              ? `${formatRatio(b.lowerBound)} – ${formatRatio(b.upperBound)}`
              : `> ${formatRatio(b.lowerBound)}`;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                  active
                    ? "bg-[#1E4775]/10 border border-[#1E4775]/30"
                    : "bg-[#1E4775]/5"
                }`}
              >
                <span className="text-[#1E4775]/70 font-mono">{range}</span>
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
      </div>
    );
  };

  return (
    <div
      key={id}
      className="rounded-md border border-[#1E4775]/15 bg-white shadow-sm overflow-visible"
    >
      <div
        className={`py-2 px-2 overflow-visible transition cursor-pointer relative group ${
          isExpanded
            ? "bg-white md:bg-[rgb(var(--surface-selected-rgb))]"
            : "bg-white md:hover:bg-[rgb(var(--surface-selected-rgb))]"
        }`}
        onClick={() => onToggleExpand(id)}
      >
        {/* Mobile layout */}
          <div className="lg:hidden relative overflow-visible">
            <div
              className={`absolute -inset-x-2 -inset-y-2 bg-[rgba(30,71,117,0.06)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] ${
                isExpanded ? "opacity-100" : ""
              }`}
            />
            <div className="px-3 pt-0 relative overflow-visible">
              <div className="relative flex items-stretch w-full gap-2 overflow-visible">
                <div className="relative flex items-stretch flex-1 h-[calc(100%+16px)] -mt-2 overflow-visible">
                <div className="flex items-center justify-between px-3 py-3 min-h-[52px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFFFFF_0%,#A8F3DC_33%,#A8F3DC_100%)] relative overflow-visible">
                  <div className="flex flex-col items-start gap-0.5 relative z-10 text-[#1E4775]">
                    <span className="text-[10px] uppercase tracking-wide text-[#1E4775]/60">
                      V.lev
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {formatLeverage(leverageRatio)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 relative z-10 pr-2">
                    <span className="text-[10px] uppercase tracking-wide text-[#0B2A2F]/60">
                      Long
                    </span>
                    <div className="flex items-center gap-2">
                      <Image
                        src={getLogoPath(longSide)}
                        alt={longSide}
                        width={26}
                        height={26}
                        className={`flex-shrink-0 rounded-full ${
                          longSide.toLowerCase() === "fxusd"
                            ? "mix-blend-multiply bg-transparent"
                            : ""
                        } ${
                          longSide.toLowerCase() === "btc"
                            ? "border border-[#1E4775]/60"
                            : ""
                        }`}
                      />
                      <span className="text-[#1E4775] font-semibold text-base">
                        {longSide}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-start px-3 py-3 min-h-[52px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFC0B5_0%,#FFC0B5_67%,#FFFFFF_100%)] overflow-visible">
                  <div className="flex flex-col items-start gap-0.5 relative z-10 pl-2">
                    <span className="text-[10px] uppercase tracking-wide text-[#0B2A2F]/60">
                      Short
                    </span>
                    <div className="flex items-center gap-2">
                      <Image
                        src={getLogoPath(shortSide)}
                        alt={shortSide}
                        width={26}
                        height={26}
                        className={`flex-shrink-0 rounded-full ${
                          shortSide.toLowerCase() === "btc"
                            ? "border border-[#1E4775]/60"
                            : ""
                        }`}
                      />
                      <span className="text-[#1E4775] font-semibold text-base">
                        {shortSide}
                      </span>
                    </div>
                  </div>
                  <div 
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => e.stopPropagation()}
                  >
                    {mintFeeRatio === 0n && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#A8F3DC] text-[#0B2A2F] border-2 border-[#1E4775] mt-1">
                        Free to mint
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 -skew-x-12 z-0">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#A8F3DC_0%,#A8F3DC_48%,#FFC0B5_52%,#FFC0B5_100%)]" />
                  <div className="absolute left-1/2 inset-y-0 w-1.5 -translate-x-1/2 bg-[#1E4775]" />
                </div>
                </div>
              </div>
            </div>
            <div className="pt-0 space-y-0 text-xs">
              <div className="bg-white text-[#1E4775] rounded-md px-3 py-3 text-[13px] -mx-2 -mb-2 border-t-2 border-[#1E4775]/40">
                <div className="flex items-center gap-2">
                  <span className="text-[#1E4775]/70 whitespace-nowrap font-semibold text-[15px]">
                    Your Position:
                  </span>
                  <span className="font-mono">
                    {userDeposit && currentValueUSD !== undefined
                      ? formatUSD(currentValueUSD)
                      : "-"}
                  </span>
                  <span className="text-[#1E4775]/70">
                    {userDeposit
                      ? `(${formatToken(userDeposit, 18, 2, 2)} ${
                          market.leveragedToken?.symbol || ""
                        })`
                      : "(-)"}
                  </span>
                  <span className="ml-auto font-mono">
                    <span
                      className={
                        userDeposit && pnlFormatted && !pnlData.isLoading
                          ? pnlFormatted.color
                          : undefined
                      }
                    >
                      {userDeposit && pnlFormatted && !pnlData.isLoading
                        ? `${pnlFormatted.text} (${
                            pnlData.unrealizedPnLPercent >= 0 ? "+" : ""
                          }${pnlData.unrealizedPnLPercent.toFixed(1)}%)`
                        : "-"}
                    </span>
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 items-center -mx-2 pt-2 pb-0">
                <div className="flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(id);
                    }}
                    className="px-4 py-1.5 text-sm font-semibold text-[#1E4775] bg-white border-2 border-[#1E4775] rounded-md inline-flex items-center gap-1 whitespace-nowrap min-w-[160px] justify-center"
                  >
                    More details
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4 text-[#1E4775] stroke-[2.5]" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-[#1E4775] stroke-[2.5]" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-center pr-2">
                  {showMaintenance ? (
                    <div className="flex min-w-[160px] justify-center">
                      <MarketMaintenanceTag />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageClick(id, market);
                      }}
                      disabled={!isConnected}
                      className="px-4 py-2 text-sm font-semibold bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap min-w-[160px] justify-center border-2 border-[#17395F] disabled:border-gray-400"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            </div>
        </div>

        {/* Desktop / tablet layout */}
        <div className="hidden lg:grid grid-cols-[32px_1.8fr_1fr_0.88fr_1fr_1fr_1.12fr_0.8fr] gap-2 md:gap-4 items-stretch text-sm md:justify-items-center overflow-visible">
          <div className="flex items-center justify-center">
            <NetworkIconCell
              chainName={(market as any).chain?.name || "Ethereum"}
              chainLogo={(market as any).chain?.logo || "icons/eth.png"}
              size={20}
            />
          </div>
          <div className="min-w-0 flex items-center w-full sm:justify-self-stretch overflow-visible">
            <div className="flex items-stretch w-full h-full overflow-visible">
              <div
                className={`relative flex items-stretch w-full h-[calc(100%+16px)] -my-2 -ml-2 after:absolute after:inset-0 after:bg-[rgba(30,71,117,0.06)] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity overflow-visible ${
                  isExpanded ? "after:opacity-100" : ""
                }`}
              >
                <div className="flex items-center justify-end px-3 py-2 text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFFFFF_0%,#A8F3DC_33%,#A8F3DC_100%)] overflow-visible">
                  <div className="flex items-center gap-2 relative z-10 pr-2">
                    <Image
                      src={getLogoPath(longSide)}
                      alt={longSide}
                      width={18}
                      height={18}
                      className={`flex-shrink-0 rounded-full ${
                        longSide.toLowerCase() === "fxusd"
                          ? "mix-blend-multiply bg-transparent"
                          : ""
                      } ${
                        longSide.toLowerCase() === "btc"
                          ? "border border-[#1E4775]/60"
                          : ""
                      }`}
                    />
                    <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                      {longSide}
                    </span>
                  </div>
                </div>
                <div className="relative flex items-center justify-start px-3 py-2 text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFC0B5_0%,#FFC0B5_67%,#FFFFFF_100%)] overflow-visible">
                  <div className="flex items-center gap-2 relative z-10 pl-2">
                    <Image
                      src={getLogoPath(shortSide)}
                      alt={shortSide}
                      width={18}
                      height={18}
                      className={`flex-shrink-0 rounded-full ${
                        shortSide.toLowerCase() === "btc"
                          ? "border border-[#1E4775]/60"
                          : ""
                      }`}
                    />
                    <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                      {shortSide}
                    </span>
                  </div>
                  <div className="ml-2 text-[#1E4775] z-10">
                    {isExpanded ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <div className="absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 -skew-x-12 z-0">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#A8F3DC_0%,#A8F3DC_48%,#FFC0B5_52%,#FFC0B5_100%)]" />
                  <div className="absolute left-1/2 top-0 h-full w-1.5 -translate-x-1/2 bg-[#1E4775]" />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center min-w-0 flex items-center justify-center">
            <div className="flex items-center gap-1.5 justify-center">
              <SimpleTooltip label={market.leveragedToken.symbol}>
                <Image
                  src={getLogoPath(market.leveragedToken.symbol)}
                  alt={market.leveragedToken.symbol}
                  width={18}
                  height={18}
                  className="flex-shrink-0 cursor-help"
                />
              </SimpleTooltip>
              <span className="text-[#1E4775] font-medium text-xs font-mono">
                {market.leveragedToken.symbol}
              </span>
            </div>
          </div>
          <div className="text-center min-w-0 flex items-center justify-center">
            <span className="text-[#1E4775] font-medium text-xs font-mono">
              {formatLeverage(leverageRatio)}
            </span>
          </div>
          <div className="text-center min-w-0 flex items-center justify-center">
            <span className="text-[#1E4775] font-medium text-xs font-mono">
              {userDeposit
                ? `${formatToken(userDeposit, 18, 2, 2)} ${
                    market.leveragedToken?.symbol || ""
                  }`
                : "-"}
            </span>
          </div>
          <div className="text-center min-w-0 flex flex-col items-center justify-center leading-tight">
            <div className="text-[#1E4775] font-medium text-xs font-mono">
              {userDeposit && currentValueUSD !== undefined
                ? formatUSD(currentValueUSD)
                : "-"}
            </div>
            {userDeposit && pnlFormatted && !pnlData.isLoading ? (
              <div className={`text-[11px] font-mono ${pnlFormatted.color}`}>
                {pnlFormatted.text} (
                {pnlData.unrealizedPnLPercent >= 0 ? "+" : ""}
                {pnlData.unrealizedPnLPercent.toFixed(1)}%)
              </div>
            ) : (
              <span className="text-[#1E4775]/50 text-[10px] font-mono">
                -
              </span>
            )}
          </div>
          <div className="text-center min-w-0 flex items-center justify-center px-1">
            <div className="flex items-center justify-center gap-0 whitespace-nowrap">
              <SimpleTooltip
                side="left"
                maxHeight="none"
                maxWidth={720}
                label={
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-white/80">
                      Current CR:{" "}
                      <span className="font-mono font-semibold">
                        {formatRatio(collateralRatio)}
                      </span>
                    </div>
                    <div className="min-w-[260px]">
                      {renderFeeBands("Mint Fees", feeBands?.mintLeveraged, true)}
                    </div>
                  </div>
                }
              >
                <span className="cursor-help inline-flex shrink-0">
                  {renderFeeValue(mintFeeRatio, true, activeMintBand, true)}
                </span>
              </SimpleTooltip>
              <span
                className="text-[#1E4775]/50 text-[9px] font-bold shrink-0 select-none leading-none px-[3px]"
                aria-hidden="true"
              >
                /
              </span>
              <SimpleTooltip
                side="left"
                maxHeight="none"
                maxWidth={720}
                label={
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-white/80">
                      Current CR:{" "}
                      <span className="font-mono font-semibold">
                        {formatRatio(collateralRatio)}
                      </span>
                    </div>
                    <div className="min-w-[260px]">
                      {renderFeeBands("Redeem Fees", feeBands?.redeemLeveraged)}
                    </div>
                  </div>
                }
              >
                <span className="cursor-help inline-flex shrink-0">
                  {renderFeeValue(redeemFeeRatio, false, activeRedeemBand, true)}
                </span>
              </SimpleTooltip>
            </div>
          </div>
          <div
            className="text-center min-w-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {showMaintenance ? (
              <MarketMaintenanceTag />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick(id, market);
                }}
                disabled={!isConnected}
                className="px-4 py-2 text-sm font-semibold bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap border-2 border-[#17395F] disabled:border-gray-400"
              >
                Manage
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <SailMarketExpandedView
          marketId={id}
          market={market}
          minterConfigData={minterConfigData}
          rebalanceThresholdData={rebalanceThresholdData}
          leverageRatio={leverageRatio}
          collateralRatio={collateralRatio}
          collateralValue={collateralValue}
          fxSAVEPriceInETH={fxSAVEPriceInETH}
          pnlData={pnlData}
          currentValueUSD={currentValueUSD}
          userDeposit={userDeposit}
          tokenPrices={tokenPrices}
        />
      )}
    </div>
  );
});

function SailMarketExpandedView({
  marketId,
  market,
  minterConfigData,
  rebalanceThresholdData,
  leverageRatio,
  collateralRatio,
  collateralValue,
  fxSAVEPriceInETH,
  pnlData,
  currentValueUSD,
  userDeposit,
  tokenPrices,
}: {
  marketId: string;
  market: any;
  minterConfigData: unknown | undefined;
  rebalanceThresholdData: bigint | undefined;
  leverageRatio: bigint | undefined;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
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
  const { isLoading: isUSDCPriceLoading } = useCoinGeckoPrice("usd-coin");

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
        } else if (
          collateralPriceUSDFromHook > 0 &&
          tokenPrices?.pegTargetUSD
        ) {
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
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-3 sm:p-4 border-t border-[#1E4775]/15 mt-0 rounded-b-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Left: Market Info & PnL */}
        <div className="space-y-2 flex flex-col min-w-0">
          {/* Description Box */}
          <div className="bg-white p-4 rounded-md border border-[#1E4775]/12 shadow-sm">
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

          {/* Mobile: Price Chart below description */}
          <div className="bg-white p-3 flex flex-col md:hidden rounded-md border border-[#1E4775]/12 shadow-sm">
            <h3 className="text-[#1E4775] font-semibold mb-3 text-sm">
              {market.leveragedToken?.symbol || "Token"} (short{" "}
              {getShortSide(market)} against {getLongSide(market)})
            </h3>
            <div className="flex-1 min-h-72">
              <PriceChart
                tokenType="STEAMED"
                selectedToken={market.leveragedToken?.symbol || ""}
                marketId={marketId}
              />
            </div>
          </div>

          {/* PnL Details - only show if user has position */}
          {hasPosition && pnlData && (
            <div className="bg-white p-4 flex-1 rounded-md border border-[#1E4775]/12 shadow-sm">
              <h3 className="text-[#1E4775] font-semibold mb-3 text-xs">
                Position Details
              </h3>
              {pnlData.error && !pnlData.isLoading && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                  PnL data is temporarily unavailable from the subgraph:{" "}
                  <span className="font-mono break-all">{pnlData.error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs [&>*:last-child]:-mt-2">
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
                <div className="col-span-2 border-t border-[#1E4775]/10 pt-1.5">
                  <div className="grid grid-cols-2 gap-x-4 text-xs">
                    <div />
                    <div className="text-right">
                      <span className="text-[#1E4775]/70 font-semibold">
                        Total PnL:
                      </span>{" "}
                      <span
                        className={`font-mono font-semibold ${
                          pnlData.isLoading
                            ? "text-[#1E4775]/50"
                            : totalPnLFormatted?.color || ""
                        }`}
                      >
                        {pnlData.isLoading || pnlData.error
                          ? "-"
                          : totalPnLFormatted?.text || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 h-full flex flex-col items-center text-center rounded-md border border-[#1E4775]/12 shadow-sm">
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
                    const wrappedAmount =
                      wrappedRateNum > 0
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

            <div className="bg-white p-3 h-full flex flex-col items-center text-center rounded-md border border-[#1E4775]/12 shadow-sm">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                {market.leveragedToken?.symbol || "Token"} Price
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {computedTokenPriceUSD !== undefined
                  ? formatUSD(computedTokenPriceUSD)
                  : "-"}
              </p>
            </div>

            <div className="bg-white p-3 h-full flex flex-col items-center text-center rounded-md border border-[#1E4775]/12 shadow-sm">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                Collateral Ratio
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatRatio(collateralRatio)}
              </p>
            </div>

            <div className="bg-white p-3 h-full flex flex-col items-center text-center rounded-md border border-[#1E4775]/12 shadow-sm">
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
        <div className="bg-white p-3 flex flex-col hidden md:flex rounded-md border border-[#1E4775]/12 shadow-sm">
          <h3 className="text-[#1E4775] font-semibold mb-3 text-sm">
            {market.leveragedToken?.symbol || "Token"} (short{" "}
            {getShortSide(market)} against {getLongSide(market)})
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
  const searchParams = useSearchParams();
  /** Nav toggle: Basic = title + markets only (no hero cards, stats strips, Sail Marks bar). See `pageLayoutView`. */
  const sailViewBasic = isBasicPageLayout(searchParams);

  const { price: sailPageEthPrice } = useCoinGeckoPrice("ethereum", 120000);
  const { price: sailPageWstETHPrice } = useCoinGeckoPrice("wrapped-steth", 120000);
  const { price: sailPageFxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving", 120000);

  const {
    isConnected,
    longFilterSelected,
    setLongFilterSelected,
    shortFilterSelected,
    setShortFilterSelected,
    chainFilterSelected,
    setChainFilterSelected,
    clearFilters,
    sailPnLSummary,
    totalSailMarks,
    sailMarksPerDay,
    isLoadingSailMarks,
    sailMarksError,
    sailMarkets,
    sailMarketIdToIndex,
    sailChainOptions,
    uniqueLongSides,
    uniqueShortSides,
    reads,
    isLoadingReads,
    isReadsError,
    refetchReads,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    refetchMinterConfigs,
    refetchRebalanceReads,
    tokenPricesByMarket,
    userDepositMap,
    refetchUserDeposits,
    sailUserStats,
    pnlFromMarkets,
    activeSailBoostEndTimestamp,
    activeMarkets,
  } = useSailPageData();

  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [manageModalTab, setManageModalTab] = useState<"mint" | "redeem">(
    "mint"
  );

  const queryClient = useQueryClient();

  const handleToggleMarketExpand = useCallback((marketId: string) => {
    setExpandedMarkets((prev) =>
      prev.includes(marketId)
        ? prev.filter((x) => x !== marketId)
        : [...prev, marketId]
    );
  }, []);

  const handleManageMarketOpen = useCallback((marketId: string, m: any) => {
    setSelectedMarketId(marketId);
    setSelectedMarket(m);
    setManageModalTab("mint");
    setManageModalOpen(true);
  }, []);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header: title always; hero + stats strips Extended only */}
          <div className="mb-2">
            <SailPageTitleSection />

            {sailViewBasic && (
              <div className="border-t border-white/10 my-3" aria-hidden />
            )}

            {!sailViewBasic && (
              <SailExtendedHero
                boostEndTimestamp={activeSailBoostEndTimestamp}
              />
            )}
          </div>

          {!sailViewBasic && (
            <>
              <div className="border-t border-white/10 my-2" />

              {isConnected && (
                <SailUserStatsCards
                  sailUserStats={sailUserStats}
                  pnlFromMarkets={pnlFromMarkets}
                  pnlSummaryLoading={sailPnLSummary.isLoading}
                />
              )}

              {sailMarksError && <SailMarksSubgraphErrorBanner />}

              <SailLedgerMarksBar
                isLoadingSailMarks={isLoadingSailMarks}
                totalSailMarks={totalSailMarks}
                sailMarksPerDay={sailMarksPerDay}
              />

              <div className="border-t border-white/10 mb-3" />
            </>
          )}

          {/* Markets List — toolbar + table (see SailMarketsSections) */}
          {isLoadingReads ? null : isReadsError ? (
            <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
              <p className="text-white text-lg font-medium mb-4">
                Error loading markets
              </p>
              <button
                type="button"
                onClick={() => refetchReads()}
                className="px-4 py-2 bg-[#FF8A7A] text-white rounded hover:bg-[#FF6B5A] transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <SailMarketsSections
              toolbarProps={{
                sailChainOptions,
                showNetworkFilter: sailChainOptions.length > 1,
                chainFilterSelected,
                setChainFilterSelected,
                uniqueLongSides,
                uniqueShortSides,
                longFilterSelected,
                setLongFilterSelected,
                shortFilterSelected,
                setShortFilterSelected,
                onClearFilters: clearFilters,
              }}
            >
              <SailMarketsTableHeader />
              <div className="space-y-2">
                {activeMarkets.map(([id, m]) => {
                  const globalIndex = sailMarketIdToIndex.get(id);
                  if (globalIndex === undefined) return null;
                  const userDeposit = userDepositMap.get(globalIndex);
                  const baseOffset = marketOffsets.get(globalIndex) ?? 0;

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
                  const hasToken = isValidAddress(leveragedTokenAddress);

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
                      isExpanded={expandedMarkets.includes(id)}
                      onToggleExpand={handleToggleMarketExpand}
                      onManageClick={handleManageMarketOpen}
                      isConnected={isConnected}
                      tokenPrices={tokenPrices}
                      minterConfigData={minterConfigByMarketId.get(id)}
                      rebalanceThresholdData={rebalanceThresholdByMarketId.get(
                        id
                      )}
                    />
                  );
                })}
              </div>
            </SailMarketsSections>
          )}
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
            onSuccess={async () => {
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
              await Promise.all([
                refetchReads(),
                refetchUserDeposits(),
                refetchMinterConfigs(),
                refetchRebalanceReads(),
              ]);
              queryClient.invalidateQueries({ queryKey: ["sailPositionPnL"] });
              queryClient.invalidateQueries({
                queryKey: ["sailPositionsPnLSummary"],
              });
              queryClient.invalidateQueries({
                queryKey: ["sailPositionsForPnL"],
              });
            }}
            leveragedTokenPriceUSD={
              tokenPricesByMarket[selectedMarketId]?.leveragedPriceUSD
            }
            ethPrice={sailPageEthPrice}
            wstETHPrice={sailPageWstETHPrice}
            fxSAVEPrice={sailPageFxSAVEPrice}
          />
        )}
      </div>
    </>
  );
}
