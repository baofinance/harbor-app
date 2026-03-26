"use client";

import React from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import { formatTimeRemaining, formatToken } from "@/utils/formatters";
import { formatCompactUSD, formatRatio } from "@/utils/anchor";
import { DEBUG_ANCHOR } from "@/config/debug";
import { computeGenesisWrappedCollateralPriceUSD } from "@/utils/wrappedCollateralPriceUSD";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import type { WithdrawalRequest } from "@/hooks/useWithdrawalRequests";
import type { VolatilityProtectionData } from "@/hooks/useVolatilityProtection";
import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import type { DefinedMarket } from "@/config/markets";

export type WithdrawAmountModalState =
  | {
      poolAddress: `0x${string}`;
      poolType: "collateral" | "sail";
      useEarly: boolean;
      symbol?: string;
      maxAmount?: bigint;
    }
  | null;

export type EarlyWithdrawModalState =
  | {
      poolAddress: `0x${string}`;
      poolType: "collateral" | "sail";
      start: bigint;
      end: bigint;
      earlyWithdrawFee: bigint;
      symbol?: string;
      poolBalance?: bigint;
    }
  | null;

export type ContractAddressesModalState =
  | {
      marketId: string;
      market: DefinedMarket;
      minterAddress: string;
    }
  | null;

export type AnchorMarketGroupExpandedSectionProps = {
  activeMarketsData: MarketData[];
  withdrawalRequests: WithdrawalRequest[];
  volProtectionData: Map<string, VolatilityProtectionData> | undefined;
  marketPositions: Record<string, any>;
  poolRewardsMap: Map<`0x${string}`, any>;
  collateralPricesMap: Map<string, CollateralPriceData>;
  peggedPriceUSDMap: Record<string, bigint | undefined>;
  coinGeckoPrices: Record<string, number | null | undefined> | undefined;
  coinGeckoLoading: boolean;
  ethPrice: number | null | undefined;
  btcPrice: number | null | undefined;
  eurPrice: number | null | undefined;
  goldPrice: number | null | undefined;
  silverPrice: number | null | undefined;
  showLiveAprLoading: boolean;
  setWithdrawAmountModal: React.Dispatch<
    React.SetStateAction<WithdrawAmountModalState>
  >;
  setEarlyWithdrawModal: React.Dispatch<
    React.SetStateAction<EarlyWithdrawModalState>
  >;
  setWithdrawAmountInput: React.Dispatch<React.SetStateAction<string>>;
  setWithdrawAmountError: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  setContractAddressesModal: React.Dispatch<
    React.SetStateAction<ContractAddressesModalState>
  >;
};

export function AnchorMarketGroupExpandedSection({
  activeMarketsData,
  withdrawalRequests,
  volProtectionData,
  marketPositions,
  poolRewardsMap,
  collateralPricesMap,
  peggedPriceUSDMap,
  coinGeckoPrices,
  coinGeckoLoading,
  ethPrice,
  btcPrice,
  eurPrice,
  goldPrice,
  silverPrice,
  showLiveAprLoading,
  setWithdrawAmountModal,
  setEarlyWithdrawModal,
  setWithdrawAmountInput,
  setWithdrawAmountError,
  setContractAddressesModal,
}: AnchorMarketGroupExpandedSectionProps) {
  return (
<div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
  {/* Consolidated Your Positions - shown once for the group */}
  {(() => {
    // Aggregate pool deposits across all markets (wallet balances shown in separate section)
    const haSymbol =
          activeMarketsData[0]?.market?.peggedToken
            ?.symbol || "ha";

    // Aggregate pool deposits across all markets
    let totalCollateralPoolDeposit = 0n;
    let totalCollateralPoolDepositUSD = 0;
    let totalSailPoolDeposit = 0n;
    let totalSailPoolDepositUSD = 0;

    // Collect all withdrawal requests for this group
    const groupWithdrawalRequests: typeof withdrawalRequests =
      [];

    activeMarketsData.forEach((md) => {
      if (
        md.collateralPoolDeposit &&
        md.collateralPoolDeposit > 0n
      ) {
        totalCollateralPoolDeposit +=
          md.collateralPoolDeposit;
        totalCollateralPoolDepositUSD +=
          md.collateralPoolDepositUSD || 0;
      }
          if (
            md.sailPoolDeposit &&
            md.sailPoolDeposit > 0n
          ) {
        totalSailPoolDeposit += md.sailPoolDeposit;
        totalSailPoolDepositUSD +=
          md.sailPoolDepositUSD || 0;
      }
      // Collect withdrawal requests for this market
          const marketRequests =
            withdrawalRequests.filter(
        (req) =>
          req.poolAddress.toLowerCase() ===
            md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
          req.poolAddress.toLowerCase() ===
            md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
      );
      groupWithdrawalRequests.push(...marketRequests);
    });

    const hasGroupPositions =
      totalCollateralPoolDepositUSD > 0 ||
      totalSailPoolDepositUSD > 0 ||
      totalCollateralPoolDeposit > 0n ||
      totalSailPoolDeposit > 0n;

    if (
      !hasGroupPositions &&
      groupWithdrawalRequests.length === 0
    ) {
      return null;
    }

    return (
      <div className="mb-4">
        {/* Withdrawal requests for the group */}
        {groupWithdrawalRequests.length > 0 && (
          <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2 mb-3">
            <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
              Withdrawal Requests
            </div>
            <div className="space-y-1.5">
                  {groupWithdrawalRequests.map(
                    (request) => {
                // Find the market this request belongs to
                const requestMarket =
                  activeMarketsData.find(
                    (md) =>
                      request.poolAddress.toLowerCase() ===
                        md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
                      request.poolAddress.toLowerCase() ===
                        md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
                  );
                const isCollateralPool =
                  request.poolAddress.toLowerCase() ===
                  requestMarket?.market.addresses?.stabilityPoolCollateral?.toLowerCase();
                const poolType = isCollateralPool
                  ? "collateral"
                  : "sail";
                      const startSec = Number(
                        request.start
                      );
                const endSec = Number(request.end);
                const isWindowOpen =
                  request.status === "window";
                const countdownTarget =
                  request.status === "waiting"
                    ? startSec
                    : endSec;

                const countdownLabel =
                  request.status === "waiting"
                    ? "Free withdraw window opens"
                    : request.status === "window"
                    ? "Window closes in"
                    : "Window expired";
                // Format time remaining without "ends in" prefix for waiting windows
                const formatTimeOnly = (
                  endDate: Date,
                  currentDate: Date
                ): string => {
                        const diffMs =
                          endDate.getTime() -
                          currentDate.getTime();
                  if (diffMs <= 0) return "Ended";

                        const diffHours =
                          diffMs / (1000 * 60 * 60);
                  const diffDays = diffHours / 24;
                        const diffMinutes =
                          diffMs / (1000 * 60);

                  if (diffDays >= 2) {
                          return `${diffDays.toFixed(
                            1
                          )} days`;
                  } else if (diffHours >= 2) {
                          return `${diffHours.toFixed(
                            1
                          )} hours`;
                  } else {
                          return `${diffMinutes.toFixed(
                            0
                          )} minutes`;
                  }
                };

                const countdownText =
                  countdownTarget > 0
                    ? request.status === "waiting"
                      ? formatTimeOnly(
                                new Date(
                                  countdownTarget * 1000
                                ),
                          request.currentTime
                            ? new Date(
                                      Number(
                                        request.currentTime
                                      ) * 1000
                              )
                            : new Date()
                        )
                      : formatTimeRemaining(
                          new Date(
                            countdownTarget * 1000
                          ).toISOString(),
                          request.currentTime
                            ? new Date(
                                Number(
                                  request.currentTime
                                ) * 1000
                              )
                            : new Date()
                        )
                    : "Ended";

                return (
                  <div
                    key={`${
                      request.poolAddress
                    }-${request.start.toString()}`}
                    className="p-2 bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 text-xs flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-[#1E4775] font-semibold">
                        {poolType === "collateral"
                          ? "Collateral"
                          : "Sail"}{" "}
                        Pool
                        {requestMarket &&
                          activeMarketsData.length >
                            1 && (
                            <span className="text-[#1E4775]/50 ml-1">
                              (
                              {requestMarket.market
                                      .collateral
                                      ?.symbol || "?"}
                              )
                            </span>
                          )}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                request.status ===
                                "window"
                            ? "bg-green-200 text-green-800 border-green-500"
                                  : request.status ===
                                    "waiting"
                            ? "bg-amber-200 text-amber-800 border-amber-500"
                            : "bg-gray-200 text-gray-700 border-gray-400"
                        }`}
                      >
                        {request.status === "window"
                          ? "Open"
                                : request.status ===
                                  "waiting"
                          ? "Waiting"
                          : "Expired"}
                      </span>
                      <span className="text-[11px] text-[#1E4775]/70">
                              {request.status ===
                              "waiting"
                          ? `${countdownLabel} ${countdownText}`
                                : `${countdownLabel}: ${countdownText}`}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={async () => {
                          if (isWindowOpen) {
                                  setWithdrawAmountInput(
                                    ""
                                  );
                                  setWithdrawAmountError(
                                    null
                                  );
                            const maxAmount =
                                    poolType ===
                                    "collateral"
                                ? requestMarket?.collateralPoolDeposit
                                : requestMarket?.sailPoolDeposit;
                            setWithdrawAmountModal({
                              poolAddress:
                                request.poolAddress,
                              poolType,
                              useEarly: false,
                              symbol: haSymbol,
                                    maxAmount:
                                      maxAmount || 0n,
                            });
                          } else {
                            setEarlyWithdrawModal({
                              poolAddress:
                                request.poolAddress,
                              poolType,
                              start: request.start,
                              end: request.end,
                              earlyWithdrawFee:
                                request.earlyWithdrawFee,
                              symbol: haSymbol,
                              poolBalance:
                                      (poolType ===
                                      "collateral"
                                  ? requestMarket?.collateralPoolDeposit
                                  : requestMarket?.sailPoolDeposit) ||
                                0n,
                            });
                          }
                        }}
                        className={`px-2 py-0.5 text-sm font-semibold rounded-full ${
                          isWindowOpen
                            ? "bg-[#1E4775] text-white hover:bg-[#17395F]"
                            : "bg-orange-500 text-white hover:bg-orange-600"
                        } transition-colors whitespace-nowrap`}
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                );
                    }
                  )}
            </div>
          </div>
        )}

        {/* Your Positions - consolidated (only stability pool deposits) */}
        {hasGroupPositions && (
          <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2 rounded-md">
            <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
              Your Positions
            </div>
            <div className="space-y-2">
                  {(() => {
                    // Show one row per (marketId, poolType) so we don't collapse positions
                    // across different markets in the same ha-token group.
                    const hasMultipleMarkets =
                      activeMarketsData.length > 1;

                    const rows: Array<{
                      key: string;
                      label: string;
                      deposit: bigint;
                      depositUSD: number;
                    }> = [];

                    activeMarketsData.forEach((md) => {
                      const marketLabel =
                        md.market?.collateral?.symbol ||
                        md.marketId;

                      if (
                        md.collateralPoolDeposit &&
                        md.collateralPoolDeposit > 0n
                      ) {
                        rows.push({
                          key: `${md.marketId}-collateral`,
                          label: `Collateral Pool${
                            hasMultipleMarkets
                              ? ` (${marketLabel})`
                              : ""
                          }`,
                          deposit:
                            md.collateralPoolDeposit,
                          depositUSD:
                            md.collateralPoolDepositUSD ||
                            0,
                        });
                      }

                      if (
                        md.sailPoolDeposit &&
                        md.sailPoolDeposit > 0n
                      ) {
                        rows.push({
                          key: `${md.marketId}-sail`,
                          label: `Sail Pool${
                            hasMultipleMarkets
                              ? ` (${marketLabel})`
                              : ""
                          }`,
                          deposit: md.sailPoolDeposit,
                          depositUSD:
                            md.sailPoolDepositUSD || 0,
                        });
                      }
                    });

                    if (rows.length === 0) return null;

                    return rows.map((r) => (
                      <div
                        key={r.key}
                        className="flex justify-between items-center text-xs"
                      >
                  <span className="text-[#1E4775]/70">
                          {r.label}:
                  </span>
                  <div className="text-right">
                    <div className="font-semibold text-[#1E4775] font-mono">
                      {formatCompactUSD(
                              r.depositUSD
                      )}
                    </div>
                    <div className="text-[10px] text-[#1E4775]/50 font-mono">
                            {formatToken(r.deposit)}{" "}
                      {haSymbol}
                    </div>
                  </div>
                </div>
                    ));
                  })()}
            </div>
          </div>
        )}
      </div>
    );
  })()}

  {activeMarketsData.map((marketData) => {
    // Get volatility protection from hook data
    const minterAddr =
      marketData.minterAddress?.toLowerCase();
    const volProtData = minterAddr
      ? volProtectionData?.get(minterAddr)
      : undefined;
    const volatilityProtection =
      volProtData?.protection ?? "-";

    // Format min collateral ratio
    const minCollateralRatioFormatted =
      marketData.minCollateralRatio
        ? `${(
                Number(marketData.minCollateralRatio) /
                1e16
          ).toFixed(2)}%`
        : "-";

    // Detect if this is an fxUSD market
    const collateralSymbol =
      marketData.market.collateral?.symbol?.toLowerCase() ||
      "";
    const isFxUSDMarket =
      collateralSymbol === "fxusd" ||
      collateralSymbol === "fxsave";

    // Get collateral price from the hook (same logic as genesis page)
        const collateralPriceOracleAddress = marketData
          .market.addresses?.collateralPrice as
      | `0x${string}`
      | undefined;
        const collateralPriceData =
          collateralPriceOracleAddress
            ? collateralPricesMap.get(
                collateralPriceOracleAddress.toLowerCase()
              )
      : undefined;

    // Get underlying price from hook (this is the underlying token price, e.g., fxUSD or stETH)
    // NOTE: The oracle returns price in peg token units (ETH or BTC), not USD
        let underlyingPriceUSD =
          collateralPriceData?.priceUSD || 0;
        const wrappedRate =
          collateralPriceData?.maxRate ||
          marketData.wrappedRate;
        // For fxUSD, fallback rate ~1.07 (fxSAVE per fxUSD) so wrapped amount is correct when oracle rate is missing
        const wrappedRateNum = wrappedRate
          ? Number(wrappedRate) / 1e18
          : isFxUSDMarket
          ? 1.07
          : 1;

    // Convert oracle price from peg token units to USD
    // The oracle returns price in the peg token (ETH for ETH/fxUSD, BTC for BTC/fxUSD, EUR for EUR/fxUSD, etc.)
        const pegTarget = (
          marketData.market as any
        )?.pegTarget?.toLowerCase();
        const isBTCMarket =
          pegTarget === "btc" || pegTarget === "bitcoin";
        const isETHMarket =
          pegTarget === "eth" || pegTarget === "ethereum";
        const isEURMarket =
          pegTarget === "eur" || pegTarget === "euro";
        const isGOLDMarket = pegTarget === "gold";
        const isSILVERMarket = pegTarget === "silver";

    if (underlyingPriceUSD > 0) {
      // Oracle price is in peg token units, convert to USD
      if (isBTCMarket) {
        // Prefer Chainlink-backed btcPrice (from useAnchorPrices) over CoinGecko-only map.
        const btcPriceUSD = btcPrice || 0;
        if (btcPriceUSD > 0) {
              underlyingPriceUSD =
                underlyingPriceUSD * btcPriceUSD;
        } else {
          // Can't convert, use 0
          underlyingPriceUSD = 0;
        }
      } else if (isETHMarket) {
        if (ethPrice && ethPrice > 0) {
              underlyingPriceUSD =
                underlyingPriceUSD * ethPrice;
        } else {
          // Can't convert, use 0
          underlyingPriceUSD = 0;
        }
      } else if (isEURMarket) {
        const eurPriceUSD = eurPrice || 0;
        if (eurPriceUSD > 0) {
          underlyingPriceUSD =
            underlyingPriceUSD * eurPriceUSD;
        } else {
          underlyingPriceUSD = 0;
        }
      } else if (isGOLDMarket) {
        const goldPriceUSD = goldPrice || 0;
        if (goldPriceUSD > 0) {
          underlyingPriceUSD =
            underlyingPriceUSD * goldPriceUSD;
        } else {
          underlyingPriceUSD = 0;
        }
      } else if (isSILVERMarket) {
        const silverPriceUSD = silverPrice || 0;
        if (silverPriceUSD > 0) {
          underlyingPriceUSD =
            underlyingPriceUSD * silverPriceUSD;
        } else {
          underlyingPriceUSD = 0;
        }
      }
      // For other markets (e.g. USD), assume oracle already returns USD price
    }

    // Fallback: For fxUSD markets, if we couldn't calculate from oracle, use $1.00
    if (isFxUSDMarket && underlyingPriceUSD === 0) {
      underlyingPriceUSD = 1.0;
    }

    // Check if CoinGecko has the wrapped token price directly
        const marketCoinGeckoId = (
          marketData.market as any
        )?.coinGeckoId as string | undefined;
        const coinGeckoReturnedPrice =
          marketCoinGeckoId &&
          coinGeckoPrices?.[marketCoinGeckoId];

        const stETHPrice =
          coinGeckoPrices?.["lido-staked-ethereum-steth"];
    const wrappedTokenPriceUSD =
      computeGenesisWrappedCollateralPriceUSD({
        underlyingPriceUSD,
        collateralSymbol,
        marketCoinGeckoId,
        coinGeckoReturnedPrice:
          typeof coinGeckoReturnedPrice === "number"
            ? coinGeckoReturnedPrice
            : undefined,
        stETHPrice: stETHPrice ?? undefined,
        wrappedRate:
          wrappedRate !== undefined && wrappedRate !== null
            ? (wrappedRate as bigint)
            : undefined,
        coinGeckoLoading,
      });

    const collateralPriceUSD = wrappedTokenPriceUSD;

    // Get user's position data for price calculation
    const positionData =
      marketPositions[marketData.marketId];

    // Total ha tokens: Use totalDebt (total supply, matches peggedTokenBalance from minter)
    const totalHaTokens =
      marketData.totalDebt !== undefined
        ? Number(marketData.totalDebt) / 1e18
        : 0;

    // Collateral value calculation
    // IMPORTANT: Minter.collateralTokenBalance() / collateralValue is returned in **underlying-equivalent units**
    // - fxUSD markets: returned value is in fxUSD units (even though the minter holds fxSAVE)
    // - wstETH markets: returned value is in stETH units (even though the minter holds wstETH)
    // This matches on-chain behavior: underlyingEq = wrappedBalance * wrappedRate (where wrappedRate is underlying per wrapped).
    const collateralTokensUnderlyingEq =
      marketData.collateralValue !== undefined
        ? Number(marketData.collateralValue) / 1e18
        : 0;

    const collateralTokensWrapped =
      wrappedRateNum > 0
            ? collateralTokensUnderlyingEq /
              wrappedRateNum
        : collateralTokensUnderlyingEq;

    // Removed debug logging

    // Calculate collateral value USD.
    // For fxUSD markets: minter returns collateral in underlying (fxUSD). 1 fxUSD ≈ $1, so value = underlyingEq * price (avoid oracle/rate bugs).
    // For wstETH/others: use wrapped amount × wrapped token price.
    let collateralValueUSD = 0;
    if (isFxUSDMarket && collateralTokensUnderlyingEq > 0) {
      // Value underlying fxUSD at ~$1 (fxUSD is USD-pegged; fxSAVE ≈ 1.07 is for wrapped, not underlying)
      collateralValueUSD = collateralTokensUnderlyingEq * 1.0;
    } else if (
      collateralTokensWrapped > 0 &&
      collateralPriceUSD > 0
    ) {
      collateralValueUSD =
        collateralTokensWrapped * collateralPriceUSD;
    }

    // Calculate total debt in USD (same calculation as market position)
    // Use peggedPriceUSDMap which contains USD prices (already converted)
    // This matches how useMarketPositions calculates walletHaUSD
    const usdPriceFromMap =
      peggedPriceUSDMap[marketData.marketId];
    // Get peg target for fallback pricing
    const pricePegTarget = (marketData.market as any)?.pegTarget?.toLowerCase() || "";
    const peggedSymbolLower = marketData.market?.peggedToken?.symbol?.toLowerCase() || "";
    const btcUsdFallback = btcPrice || 0;
    const ethUsdFallback = ethPrice || 0;
    const eurUsdFallback = eurPrice || 0;

    const peggedPriceUSD =
      usdPriceFromMap && usdPriceFromMap > 0n
        ? Number(usdPriceFromMap) / 1e18
        : (pricePegTarget === "btc" || peggedSymbolLower.includes("btc")) && btcUsdFallback > 0
        ? btcUsdFallback
        : (pricePegTarget === "eth" || peggedSymbolLower.includes("eth")) && ethUsdFallback > 0
        ? ethUsdFallback
        : (pricePegTarget === "eur" || peggedSymbolLower.includes("eur")) && eurUsdFallback > 0
        ? eurUsdFallback
        : positionData?.peggedTokenPrice &&
          positionData.peggedTokenPrice > 0n
        ? Number(positionData.peggedTokenPrice) / 1e18
        : marketData.peggedTokenPrice &&
          marketData.peggedTokenPrice > 0n
        ? Number(marketData.peggedTokenPrice) / 1e18
        : 1; // Default to $1 peg
    // Use same calculation as positionData.walletHaUSD
        const totalDebtUSD =
          totalHaTokens * peggedPriceUSD;

    return (
      <React.Fragment key={marketData.marketId}>
            <div className="bg-white p-2 mb-2 border border-[#1E4775]/10 rounded-md">
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() =>
              setContractAddressesModal({
                marketId: marketData.marketId,
                market: marketData.market,
                      minterAddress:
                        marketData.minterAddress ??
                        ((marketData.market as any)
                          ?.addresses
                          ?.minter as string) ??
                        "0x0000000000000000000000000000000000000000",
              })
            }
            className="text-[#1E4775]/60 hover:text-[#1E4775] text-xs font-medium transition-colors flex items-center gap-1"
          >
            <span>Contracts</span>
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>
        {(() => {
          // Calculate TVL in USD for both pools from stability pool contracts
          // Use the same CR-aware USD pricing as positions (prefer peggedPriceUSDMap; fallback to contract reads)
          const tvlUsdPriceFromMap =
            peggedPriceUSDMap[marketData.marketId];
          // Extra robustness: if the USD map is missing/zero for haBTC/haETH/haEUR,
          // fall back to CoinGecko peg-target USD price.
          const tvlPegTarget = (marketData.market as any)?.pegTarget?.toLowerCase() || "";
          const peggedSymbolLower =
                  marketData.market?.peggedToken?.symbol?.toLowerCase?.() ||
                  "";
          const btcUsdFallback = btcPrice || 0;
          const ethUsdFallback = ethPrice || 0;
          const eurUsdFallback = eurPrice || 0;

          const peggedPriceUSD =
                  tvlUsdPriceFromMap &&
                  tvlUsdPriceFromMap > 0n
              ? Number(tvlUsdPriceFromMap) / 1e18
              : (tvlPegTarget === "btc" || peggedSymbolLower.includes("btc")) &&
                btcUsdFallback > 0
              ? btcUsdFallback
              : (tvlPegTarget === "eth" || peggedSymbolLower.includes("eth")) &&
                ethUsdFallback > 0
              ? ethUsdFallback
              : (tvlPegTarget === "eur" || peggedSymbolLower.includes("eur")) &&
                eurUsdFallback > 0
              ? eurUsdFallback
              : positionData?.peggedTokenPrice &&
                positionData.peggedTokenPrice > 0n
                    ? Number(
                        positionData.peggedTokenPrice
                      ) / 1e18
              : marketData.peggedTokenPrice &&
                marketData.peggedTokenPrice > 0n
                    ? Number(
                        marketData.peggedTokenPrice
                      ) / 1e18
              : 1; // fallback to $1 peg if price missing

          const collateralPoolTVLTokens =
            marketData.collateralPoolTVL
                    ? Number(
                        marketData.collateralPoolTVL
                      ) / 1e18
              : 0;
          const collateralPoolTVLUSD =
                  collateralPoolTVLTokens *
                  peggedPriceUSD;

                const sailPoolTVLTokens =
                  marketData.sailPoolTVL
                    ? Number(marketData.sailPoolTVL) /
                      1e18
            : 0;
          const sailPoolTVLUSD =
            sailPoolTVLTokens * peggedPriceUSD;

          if (DEBUG_ANCHOR) {
            // eslint-disable-next-line no-console
            console.log("[Anchor][TVL]", {
              marketId: marketData.marketId,
                    collateralPoolTVL:
                      marketData.collateralPoolTVL?.toString(),
                    sailPoolTVL:
                      marketData.sailPoolTVL?.toString(),
              peggedPriceUSD,
            });
          }

          // Calculate APR values for display
                const collateralPoolAddress = (
                  marketData.market as any
                )?.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined;
                const sailPoolAddress = (
                  marketData.market as any
                )?.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined;

                const collateralPoolReward =
                  collateralPoolAddress
                    ? poolRewardsMap.get(
                        collateralPoolAddress
                      )
            : undefined;
          const sailPoolReward = sailPoolAddress
            ? poolRewardsMap.get(sailPoolAddress)
            : undefined;

          // Get APR values - use rewardTokenAPRs for per-token breakdown, or totalRewardAPR for single value
                const collateralPoolAPR =
                  collateralPoolReward?.totalRewardAPR ||
                  0;
                const sailPoolAPR =
                  sailPoolReward?.totalRewardAPR || 0;

          return (
            <>
              {/* Row 1: Collateral, Min CR, Vol. Protection, Collateral Pool TVL, Sail Pool TVL */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 mb-1.5">
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Collateral
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                          {marketData.market.collateral
                            ?.symbol || "ETH"}
                  </div>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Min CR
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                    {minCollateralRatioFormatted}
                  </div>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                    Vol. Protection
                    <SimpleTooltip
                      side="top"
                      label={
                        <div className="space-y-2">
                          <p className="font-semibold mb-1">
                            Volatility Protection
                          </p>
                          <p>
                                  The percentage adverse
                                  price movement between
                                  collateral and the
                                  pegged token that the
                                  system can withstand
                                  before reaching the
                                  depeg point (100%
                                  collateral ratio).
                          </p>
                          <p>
                                  For example, an
                                  ETH-pegged token with
                                  USD collateral is
                                  protected against ETH
                                  price spikes (ETH
                                  becoming more expensive
                                  relative to USD).
                          </p>
                          <p>
                                  This accounts for
                                  stability pools that can
                                  rebalance and improve
                                  the collateral ratio
                                  during adverse price
                                  movements.
                          </p>
                          <p className="text-xs text-gray-400 italic">
                            Higher percentage = more
                            protection. Assumes no
                            additional deposits or
                            withdrawals.
                          </p>
                        </div>
                      }
                    >
                      <span className="text-[#1E4775]/30 cursor-help">
                        [?]
                      </span>
                    </SimpleTooltip>
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                    {volatilityProtection}
                  </div>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Collateral Pool TVL
                  </div>
                  <SimpleTooltip
                    label={
                      collateralPoolTVLTokens > 0
                        ? `${collateralPoolTVLTokens.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} ${
                                  marketData.market
                                    .peggedToken
                              ?.symbol || "ha"
                          }`
                        : "No deposits"
                    }
                  >
                    <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                      {collateralPoolTVLUSD > 0
                        ? collateralPoolTVLUSD < 100
                                ? `$${collateralPoolTVLUSD.toFixed(
                                    2
                                  )}`
                                : formatCompactUSD(
                                    collateralPoolTVLUSD
                                  )
                        : collateralPoolTVLUSD === 0
                        ? "$0.00"
                        : "-"}
                    </div>
                  </SimpleTooltip>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Sail Pool TVL
                  </div>
                  <SimpleTooltip
                    label={
                      sailPoolTVLTokens > 0
                        ? `${sailPoolTVLTokens.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} ${
                                  marketData.market
                                    .peggedToken
                              ?.symbol || "ha"
                          }`
                        : "No deposits"
                    }
                  >
                    <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                      {sailPoolTVLUSD > 0
                        ? sailPoolTVLUSD < 100
                                ? `$${sailPoolTVLUSD.toFixed(
                                    2
                                  )}`
                                : formatCompactUSD(
                                    sailPoolTVLUSD
                                  )
                        : sailPoolTVLUSD === 0
                        ? "$0.00"
                        : "-"}
                    </div>
                  </SimpleTooltip>
                </div>
              </div>

              {/* Row 2: Collateral (USD), Current CR, Total haETH, Collateral Pool APR, Sail Pool APR */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Collateral (USD)
                  </div>
                  <SimpleTooltip
                    label={
                      <div className="space-y-1">
                        <div>
                          {collateralTokensUnderlyingEq.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                        )}{" "}
                                {marketData.market
                                  .collateral
                            ?.underlyingSymbol ||
                                  (isFxUSDMarket
                                    ? "fxUSD"
                                    : "stETH")}{" "}
                          (underlying)
                        </div>
                        <div className="text-white/70">
                          {collateralTokensWrapped.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}{" "}
                                {marketData.market
                                  .collateral?.symbol ||
                                  "ETH"}{" "}
                          (wrapped)
                        </div>
                      </div>
                    }
                  >
                    <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                      {collateralValueUSD > 0
                              ? `$${
                                  collateralValueUSD < 100
                                    ? collateralValueUSD.toFixed(
                                        2
                                      )
                            : collateralValueUSD.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }
                                      )
                                }`
                        : collateralValueUSD === 0
                        ? "$0.00"
                        : "-"}
                    </div>
                  </SimpleTooltip>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Current CR
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                    {formatRatio(
                      marketData.collateralRatio
                    )}
                  </div>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                    Total{" "}
                    {marketData.market.peggedToken
                      ?.symbol || "ha"}
                  </div>
                  <SimpleTooltip
                    label={
                      totalDebtUSD > 0
                        ? `$${totalDebtUSD.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }
                          )} USD`
                        : "No tokens minted"
                    }
                  >
                    <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                      {totalHaTokens > 0
                        ? totalHaTokens.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            }
                          )
                        : totalHaTokens === 0
                        ? "0.0000"
                        : "-"}
                    </div>
                  </SimpleTooltip>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                    Collateral Pool APR
                    <SimpleTooltip
                      side="top"
                      label={
                        <div className="space-y-2">
                          <p className="font-semibold mb-1">
                                  Collateral Pool APR
                                  Calculation
                          </p>
                          <p>
                                  The APR is calculated
                                  from reward rates for
                                  all active reward tokens
                                  (e.g., fxSAVE, wstETH)
                                  in the pool.
                          </p>
                          <p className="font-semibold mt-2">
                            Formula:
                          </p>
                          <p className="text-xs font-mono bg-white/10 p-2 rounded">
                                  APR = (Annual Rewards
                                  Value USD / Deposit
                                  Value USD) × 100
                          </p>
                          <p className="text-xs mt-2">
                            Where:
                          </p>
                          <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                                  <li>
                                    Annual Rewards =
                                    (rewardRate ×
                                    seconds_per_year) /
                                    1e18 ×
                                    rewardTokenPriceUSD
                                  </li>
                                  <li>
                                    Deposit Value =
                                    (poolTVL / 1e18) ×
                                    depositTokenPriceUSD
                                  </li>
                                  <li>
                                    All reward tokens'
                                    APRs are summed to get
                                    the total APR
                                  </li>
                          </ul>
                          <p className="text-xs text-gray-400 italic mt-2">
                                  The APR reflects the
                                  annualized return from
                                  all reward tokens
                                  currently streaming into
                                  the pool.
                          </p>
                        </div>
                      }
                    >
                      <span className="text-[#1E4775]/30 cursor-help">
                        [?]
                      </span>
                    </SimpleTooltip>
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                    {showLiveAprLoading
                      ? "Loading"
                      : collateralPoolAPR > 0
                            ? `${collateralPoolAPR.toFixed(
                                2
                              )}%`
                      : "-"}
                  </div>
                </div>
                <div className="bg-[#1E4775]/5 p-1.5 text-center">
                  <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                    Sail Pool APR
                    <SimpleTooltip
                      side="top"
                      label={
                        <div className="space-y-2">
                          <p className="font-semibold mb-1">
                                  Sail Pool APR
                                  Calculation
                          </p>
                          <p>
                                  The APR is calculated
                                  from reward rates for
                                  all active reward tokens
                                  (e.g., fxSAVE, wstETH)
                                  in the pool.
                          </p>
                          <p className="font-semibold mt-2">
                            Formula:
                          </p>
                          <p className="text-xs font-mono bg-white/10 p-2 rounded">
                                  APR = (Annual Rewards
                                  Value USD / Deposit
                                  Value USD) × 100
                          </p>
                          <p className="text-xs mt-2">
                            Where:
                          </p>
                          <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                                  <li>
                                    Annual Rewards =
                                    (rewardRate ×
                                    seconds_per_year) /
                                    1e18 ×
                                    rewardTokenPriceUSD
                                  </li>
                                  <li>
                                    Deposit Value =
                                    (poolTVL / 1e18) ×
                                    depositTokenPriceUSD
                                  </li>
                                  <li>
                                    All reward tokens'
                                    APRs are summed to get
                                    the total APR
                                  </li>
                          </ul>
                          <p className="text-xs text-gray-400 italic mt-2">
                                  The APR reflects the
                                  annualized return from
                                  all reward tokens
                                  currently streaming into
                                  the pool.
                          </p>
                        </div>
                      }
                    >
                      <span className="text-[#1E4775]/30 cursor-help">
                        [?]
                      </span>
                    </SimpleTooltip>
                  </div>
                  <div className="text-xs font-semibold text-[#1E4775]">
                    {showLiveAprLoading
                      ? "Loading"
                      : sailPoolAPR > 0
                      ? `${sailPoolAPR.toFixed(2)}%`
                      : "-"}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
      </React.Fragment>
    );
  })}
</div>
  );
}
