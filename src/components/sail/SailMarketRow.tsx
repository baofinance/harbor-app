"use client";

import React, { useMemo } from "react";
import { useContractRead } from "wagmi";
import Image from "next/image";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { isMarketInMaintenance, type DefinedMarket } from "@/config/markets";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { WRAPPED_PRICE_ORACLE_ABI } from "@/abis/shared";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { parseLongSide, parseShortSide } from "@/utils/marketSideLabels";
import {
  bandsFromConfig,
  getActiveFeeBand,
  getCurrentFee,
} from "@/utils/sailFeeBands";
import {
  formatLeverage,
  formatPnL,
  formatToken,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import { getLogoPath } from "@/components/shared";
import SimpleTooltip from "@/components/SimpleTooltip";
import NetworkIconCell from "@/components/NetworkIconCell";
import { SailMintRedeemFeeColumn } from "./SailMintRedeemFeeColumn";
import type { SailContractReads } from "@/types/sail";
import type { SailMarketPnLData } from "./sailMarketTypes";
import { SailMarketExpandedView } from "./SailMarketExpandedView";
import { INDEX_MANAGE_BUTTON_CLASS_DESKTOP } from "@/utils/indexPageManageButton";

export const SailMarketRow = React.memo(function SailMarketRow({
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
  market: DefinedMarket;
  baseOffset: number;
  hasOracle: boolean;
  hasToken: boolean;
  reads: SailContractReads;
  userDeposit: bigint | undefined;
  isExpanded: boolean;
  onToggleExpand: (marketId: string) => void;
  onManageClick: (marketId: string, m: DefinedMarket) => void;
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
  const leverageRatio = reads?.[baseOffset]?.result as bigint | undefined;
  const collateralRatio = reads?.[baseOffset + 2]?.result as bigint | undefined;
  const collateralValue = reads?.[baseOffset + 3]?.result as bigint | undefined;

  const oracleOffset = 4;
  let fxSAVEPriceInETH: bigint | undefined;
  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  const priceOracleAddress = market.addresses?.collateralPrice as
    | `0x${string}`
    | undefined;

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
    const cfg = minterConfigData as Record<string, unknown>;
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

  if (!fxSAVEPriceInETH && typeof fxSAVEPriceInETHDirect === "bigint") {
    fxSAVEPriceInETH = fxSAVEPriceInETHDirect;
  }

  const tokenOffset = hasOracle ? (isFxUSDMarket ? 6 : 5) : 4;
  const tokenName = hasToken
    ? (reads?.[baseOffset + tokenOffset]?.result as string | undefined)
    : undefined;
  const shortSide = parseShortSide(tokenName, market);
  const longSide = parseLongSide(tokenName, market);
  const showMaintenance = isMarketInMaintenance(market);

  let currentValueUSD: number | undefined;
  if (userDeposit && tokenPrices && tokenPrices.leveragedPriceUSD > 0) {
    const balanceNum = Number(userDeposit) / 1e18;
    currentValueUSD = balanceNum * tokenPrices.leveragedPriceUSD;
  }

  const leveragedTokenAddress = market.addresses?.leveragedToken as
    | `0x${string}`
    | undefined;

  const pnlSubgraph = useSailPositionPnL({
    tokenAddress: leveragedTokenAddress || "",
    minterAddress: market.addresses?.minter as `0x${string}` | undefined,
    startBlock: (market as { startBlock?: number }).startBlock,
    genesisAddress: market.addresses?.genesis as `0x${string}` | undefined,
    genesisLeveragedRatio: market.genesis?.tokenDistribution?.leveraged
      ?.ratio as number | undefined,
    pegTarget: market.pegTarget as "ETH" | "BTC" | undefined,
    debug: process.env.NODE_ENV === "development",
    currentTokenPrice: tokenPrices?.leveragedPriceUSD,
    enabled: !!leveragedTokenAddress && !!userDeposit && userDeposit > 0n,
  });

  const rawPnlError = pnlSubgraph.error as unknown;
  const pnlError =
    rawPnlError && typeof rawPnlError === "object" && "message" in rawPnlError
      ? String((rawPnlError as { message?: unknown }).message)
      : rawPnlError
      ? String(rawPnlError)
      : undefined;

  const pnlData: SailMarketPnLData = {
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
    <div
      key={id}
      className="rounded-md border border-[#1E4775]/15 bg-white shadow-sm overflow-hidden"
    >
      <div
        className={`py-2 px-2 overflow-visible transition cursor-pointer relative group ${
          isExpanded
            ? "bg-white md:bg-[rgb(var(--surface-selected-rgb))]"
            : "bg-white md:hover:bg-[rgb(var(--surface-selected-rgb))]"
        }`}
        onClick={() => onToggleExpand(id)}
      >
        <div className="lg:hidden relative overflow-visible">
          <div
            className={`absolute -inset-x-2 -inset-y-2 bg-[rgba(30,71,117,0.06)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] ${
              isExpanded ? "opacity-100" : ""
            }`}
          />
          <div className="px-3 pt-0 relative overflow-visible">
            <div className="relative flex items-stretch w-full gap-2 overflow-visible">
              <div className="relative flex items-stretch flex-1 h-[calc(100%+17px)] -mt-2 -translate-y-px overflow-hidden rounded-md isolate [contain:paint]">
                <div className="flex items-center justify-between px-3 py-3 min-h-[54px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFFFFF_0%,#A8F3DC_33%,#A8F3DC_100%)] relative overflow-hidden">
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
                <div className="relative flex items-center justify-start px-3 py-3 min-h-[54px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFC0B5_0%,#FFC0B5_67%,#FFFFFF_100%)] overflow-hidden">
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageClick(id, market);
                    }}
                    disabled={!isConnected}
                    className={`${INDEX_MANAGE_BUTTON_CLASS_DESKTOP} min-w-[160px] justify-center`}
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-[32px_2.2fr_0.92fr_0.82fr_0.92fr_0.92fr_0.96fr_0.72fr] gap-2 md:gap-3 lg:gap-3.5 items-stretch text-sm md:justify-items-center overflow-visible">
          <div className="flex items-center justify-center">
            <NetworkIconCell
              chainName={market.chain?.name || "Ethereum"}
              chainLogo={market.chain?.logo || "icons/eth.png"}
              size={20}
            />
          </div>
          <div className="min-w-0 flex items-center w-full sm:justify-self-stretch overflow-visible">
            <div className="flex items-stretch w-full h-full overflow-visible">
              <div
                className={`relative flex items-stretch w-full h-[calc(100%+17px)] -mt-2 -mb-[7px] -ml-2 -translate-y-px after:absolute after:inset-0 after:rounded-md after:bg-[rgba(30,71,117,0.06)] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity overflow-hidden rounded-md isolate [contain:paint] ${
                  isExpanded ? "after:opacity-100" : ""
                }`}
              >
                <div className="flex items-center justify-end px-3 py-[9px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFFFFF_0%,#A8F3DC_33%,#A8F3DC_100%)] overflow-hidden">
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
                <div className="relative flex items-center justify-start min-w-0 px-2 sm:px-3 py-[9px] text-[#0B2A2F] w-1/2 bg-[linear-gradient(90deg,#FFC0B5_0%,#FFC0B5_67%,#FFFFFF_100%)] overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10 pl-1.5 sm:pl-2">
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
                    <span className="text-[#1E4775] font-medium text-sm lg:text-base min-w-0">
                      {shortSide}
                    </span>
                  </div>
                  <div className="ml-1 shrink-0 text-[#1E4775] z-10">
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
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
          <div className="text-center min-w-0 flex items-center justify-center px-0.5">
            <SailMintRedeemFeeColumn
              compactRow
              collateralRatio={collateralRatio}
              mintFeeRatio={mintFeeRatio}
              redeemFeeRatio={redeemFeeRatio}
              activeMintBand={activeMintBand}
              activeRedeemBand={activeRedeemBand}
              mintBands={feeBands?.mintLeveraged}
              redeemBands={feeBands?.redeemLeveraged}
            />
          </div>
          <div
            className="text-center min-w-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {showMaintenance ? (
              <MarketMaintenanceTag />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick(id, market);
                }}
                disabled={!isConnected}
                className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
              >
                Manage
              </button>
            )}
          </div>
        </div>
      </div>

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
