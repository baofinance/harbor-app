"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
  formatLeverage,
  formatPnL,
  formatRatio,
  formatToken,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import type { DefinedMarket } from "@/config/markets";
import type { SailMarketPnLData } from "./sailMarketTypes";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="min-h-72 flex items-center justify-center text-[#1E4775]/60 text-sm">
      Loading chart…
    </div>
  ),
});

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

  const minCollateralRatio = useMemo(() => {
    if (
      rebalanceThresholdData !== undefined &&
      rebalanceThresholdData !== null
    ) {
      return rebalanceThresholdData as bigint;
    }

    if (!minterConfigData) return undefined;
    type MinterConfigBands = {
      mintPeggedIncentiveConfig?: {
        collateralRatioBandUpperBounds?: readonly bigint[];
      };
      redeemPeggedIncentiveConfig?: {
        collateralRatioBandUpperBounds?: readonly bigint[];
      };
      mintLeveragedIncentiveConfig?: {
        collateralRatioBandUpperBounds?: readonly bigint[];
      };
      redeemLeveragedIncentiveConfig?: {
        collateralRatioBandUpperBounds?: readonly bigint[];
      };
    };
    const config = minterConfigData as MinterConfigBands;
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
      return allFirstBounds.reduce((min, current) =>
        current < min ? current : min
      );
    }
    return undefined;
  }, [rebalanceThresholdData, minterConfigData]);

  const pegTarget = market.pegTarget || "USD";
  const underlyingToken =
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    "USD";

  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  let tvlUSD: number | undefined;
  if (collateralValue) {
    const collateralTokensUnderlyingEq = Number(collateralValue) / 1e18;
    const wrappedRateNum =
      wrappedRateFromHook !== undefined
        ? Number(wrappedRateFromHook) / 1e18
        : 1.0;

    const collateralTokensWrapped =
      wrappedRateNum > 0
        ? collateralTokensUnderlyingEq / wrappedRateNum
        : collateralTokensUnderlyingEq;

    if (isFxUSDMarket && collateralTokensUnderlyingEq > 0) {
      let fxSAVEPriceUSD = 0;
      if (!isCollateralPriceLoading && !isCoinGeckoLoading) {
        if (fxSAVEPrice && fxSAVEPrice > 1.0) {
          fxSAVEPriceUSD = fxSAVEPrice;
        } else if (fxSAVEPriceInETH && ethPrice) {
          const fxSAVEPriceInETHNum = Number(fxSAVEPriceInETH) / 1e18;
          const ethPriceUSD = ethPrice;
          const calculatedPrice = fxSAVEPriceInETHNum * ethPriceUSD;
          if (calculatedPrice > 1.0) {
            fxSAVEPriceUSD = calculatedPrice;
          } else {
            fxSAVEPriceUSD = 1.08;
          }
        } else {
          fxSAVEPriceUSD = 1.08;
        }
      }

      if (
        fxSAVEPriceUSD > 0 &&
        !isCollateralPriceLoading &&
        !isCoinGeckoLoading
      ) {
        tvlUSD = collateralTokensWrapped * fxSAVEPriceUSD;
      }
    } else if (!isFxUSDMarket && collateralTokensUnderlyingEq > 0) {
      let effectivePrice = 0;
      if (!isCollateralPriceLoading && !isCoinGeckoLoading) {
        if (wstETHPrice) {
          effectivePrice = wstETHPrice;
        } else if (
          collateralPriceUSDFromHook > 0 &&
          tokenPrices?.pegTargetUSD
        ) {
          const underlyingPriceUSD =
            collateralPriceUSDFromHook * tokenPrices.pegTargetUSD;
          effectivePrice = underlyingPriceUSD * wrappedRateNum;
        } else {
          effectivePrice = 3960;
        }
      }

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

  const computedTokenPriceUSD = tokenPrices?.leveragedPriceUSD;

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-3 sm:p-4 border-t border-[#1E4775]/15 mt-0 rounded-b-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-2 flex flex-col min-w-0">
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

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 h-full flex flex-col items-center text-center rounded-md border border-[#1E4775]/12 shadow-sm">
              <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">TVL</h3>
              <p className="text-sm font-bold text-[#1E4775]">
                {(() => {
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
