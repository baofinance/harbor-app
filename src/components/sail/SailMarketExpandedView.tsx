"use client";

import React, { useMemo } from "react";
import { HARBOR_FROSTED_LIGHT_CARD_ROUNDED } from "@/components/shared/harborFrostedSurfaceStyles";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
  formatLeverage,
  formatLeverageFromCollateralRatio,
  formatPnL,
  formatRatio,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import {
  buildSailMarketDetailMetrics,
  resolveMinCollateralRatio,
} from "@/utils/sailMarketMetrics";
import type { DefinedMarket } from "@/config/markets";
import type { SailMarketPnLData } from "./sailMarketTypes";
import { SailMarketPriceChart } from "./SailMarketPriceChart";

type SailMarketExpandedViewProps = {
  marketId: string;
  market: DefinedMarket;
  minterConfigData: unknown | undefined;
  rebalanceThresholdData: bigint | undefined;
  leverageRatio: bigint | undefined;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
  fxSAVEPriceInETH?: bigint;
  pnlData?: SailMarketPnLData;
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
};

export function SailMarketExpandedView({
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
}: SailMarketExpandedViewProps) {
  const { price: ethPrice, isLoading: isEthPriceLoading } =
    useCoinGeckoPrice("ethereum");

  const { price: fxSAVEPrice, isLoading: isFxSAVEPriceLoading } =
    useCoinGeckoPrice("fx-usd-saving");
  const { isLoading: isUSDCPriceLoading } = useCoinGeckoPrice("usd-coin");

  const { price: wstETHPrice, isLoading: isWstETHPriceLoading } =
    useCoinGeckoPrice("wrapped-steth");

  const isCoinGeckoLoading =
    isEthPriceLoading ||
    isFxSAVEPriceLoading ||
    isUSDCPriceLoading ||
    isWstETHPriceLoading;

  const priceOracleAddress = market.addresses?.collateralPrice as
    | `0x${string}`
    | undefined;
  const {
    priceUSD: collateralPriceUSDFromHook,
    maxRate: wrappedRateFromHook,
    isLoading: isCollateralPriceLoading,
  } = useCollateralPrice(priceOracleAddress);

  const minCollateralRatio = useMemo(
    () => resolveMinCollateralRatio(rebalanceThresholdData, minterConfigData),
    [rebalanceThresholdData, minterConfigData]
  );

  const detailMetrics = useMemo(
    () =>
      buildSailMarketDetailMetrics({
        market,
        marketId,
        collateralValue,
        leverageRatio,
        collateralRatio,
        minterConfigData,
        rebalanceThresholdData,
        tokenPrices: tokenPrices
          ? {
              leveragedPriceUSD: tokenPrices.leveragedPriceUSD,
              pegTargetUSD: tokenPrices.pegTargetUSD,
            }
          : undefined,
        prices: {
          wrappedRate: wrappedRateFromHook,
          fxSAVEPrice,
          fxSAVEPriceInETH,
          ethPrice,
          wstETHPrice,
          collateralPriceUSD: collateralPriceUSDFromHook,
          pegTargetUSD: tokenPrices?.pegTargetUSD,
          isCollateralPriceLoading,
          isCoinGeckoLoading,
        },
      }),
    [
      market,
      marketId,
      collateralValue,
      leverageRatio,
      collateralRatio,
      minterConfigData,
      rebalanceThresholdData,
      tokenPrices,
      wrappedRateFromHook,
      fxSAVEPrice,
      fxSAVEPriceInETH,
      ethPrice,
      wstETHPrice,
      collateralPriceUSDFromHook,
      isCollateralPriceLoading,
      isCoinGeckoLoading,
    ]
  );

  const pegTarget = detailMetrics.pegTarget;
  const underlyingToken = detailMetrics.underlyingToken;
  const tvlUSD = detailMetrics.tvlUSD;

  const hasPosition = userDeposit && userDeposit > 0n;
  const totalPnL = pnlData ? pnlData.realizedPnL + pnlData.unrealizedPnL : 0;
  const totalPnLFormatted = totalPnL !== 0 ? formatPnL(totalPnL) : null;

  const computedTokenPriceUSD = detailMetrics.tokenPriceUSD;
  const tvlCollateralDisplay = detailMetrics.tvlCollateralDisplay;

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-3 sm:p-4 border-t border-[#1E4775]/15 mt-0 rounded-b-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-2 flex flex-col min-w-0">
          <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-4`}>
            <p className="text-xs text-[#1E4775]/80 leading-relaxed">
              Composable short {pegTarget} against {underlyingToken} with
              variable, rebalancing leverage and no funding fees.
              {minCollateralRatio !== undefined && (
                <>
                  {" "}
                  Rebalances at{" "}
                  {formatLeverageFromCollateralRatio(minCollateralRatio)}
                </>
              )}
            </p>
          </div>

          <div className="md:hidden">
            <SailMarketPriceChart marketId={marketId} market={market} />
          </div>

          {hasPosition && pnlData && (
            <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-4 flex-1`}>
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

          <div className="grid grid-cols-2 gap-2">
            <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-3 h-full flex flex-col items-center text-center`}>
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">TVL</h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {tvlCollateralDisplay}
              </p>
              {tvlUSD !== undefined && (
                <p className="text-xs text-[#1E4775]/70 mt-0.5">
                  {formatUSD(tvlUSD)}
                </p>
              )}
            </div>

            <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-3 h-full flex flex-col items-center text-center`}>
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                {market.leveragedToken?.symbol || "Token"} Price
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {computedTokenPriceUSD !== undefined
                  ? formatUSD(computedTokenPriceUSD)
                  : "-"}
              </p>
            </div>

            <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-3 h-full flex flex-col items-center text-center`}>
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                Collateral Ratio
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatRatio(collateralRatio)}
              </p>
            </div>

            <div className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-3 h-full flex flex-col items-center text-center`}>
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
                Current leverage
              </h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {formatLeverage(leverageRatio)}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <SailMarketPriceChart marketId={marketId} market={market} />
        </div>
      </div>
    </div>
  );
}
