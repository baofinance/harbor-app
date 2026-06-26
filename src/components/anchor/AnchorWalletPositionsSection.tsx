"use client";

import React from "react";
import { HARBOR_FROSTED_INDEX_SURFACE } from "@/components/shared/harborFrostedSurfaceStyles";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import {
  ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME,
  ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME,
} from "@/components/anchor/anchorMarketsTableGrid";
import { INDEX_MANAGE_BUTTON_CLASS_DESKTOP } from "@/utils/indexPageManageButton";
import { formatCompactUSD } from "@/utils/anchor";
import { formatToken } from "@/utils/formatters";
import { TokenLogo, getLogoPath } from "@/components/shared";
import { HarborStatusPill } from "@/components/shared/HarborStatusPill";
import { HARBOR_DATA_ROW_HOVER_CLASS } from "@/components/shared/harborDataRowStyles";
import NetworkIconCell from "@/components/NetworkIconCell";
import type { DefinedMarket } from "@/config/markets";
import { DEBUG_ANCHOR } from "@/config/debug";

export type AnchorWalletPositionsSectionProps = {
  isConnected: boolean;
  address?: `0x${string}`;
  allMarketsData: any[];
  peggedPriceUSDMap?: Record<string, bigint | undefined>;
  mergedPeggedPriceMap?: Record<string, bigint | undefined>;
  coinGeckoPrices?: Record<string, number | null | undefined>;
  eurPrice?: number | null;
  btcPrice?: number | null;
  ethPrice?: number | null;
  openManageModal: (payload: {
    marketId: string;
    market: DefinedMarket;
    initialTab?: "deposit" | "mint" | "withdraw" | "redeem" | "deposit-mint" | "withdraw-redeem";
    simpleMode?: boolean;
    bestPoolType?: "collateral" | "sail";
    allMarkets?: Array<{ marketId: string; market: DefinedMarket }>;
    initialDepositAsset?: string;
  }) => void;
};

function WalletPositionInactiveTag() {
  return <HarborStatusPill label="Inactive" variant="coral" />;
}

export function AnchorWalletPositionsSection(props: AnchorWalletPositionsSectionProps) {
  const {
    isConnected,
    address,
    allMarketsData,
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    coinGeckoPrices,
    eurPrice,
    btcPrice,
    ethPrice,
    openManageModal,
  } = props;

if (!isConnected || !address) return null;

            // Group markets by ha token address to find wallet positions not in pools
            const walletPositionsByToken = new Map<
              string,
              {
                tokenAddress: string;
                symbol: string;
                balance: bigint;
                balanceUSD: number;
                markets: Array<{
                  marketId: string;
                  market: any;
                  marketData: (typeof allMarketsData)[0];
                }>;
              }
            >();

            // Iterate through all markets to find wallet positions
            allMarketsData.forEach((marketData) => {
              const peggedTokenAddress = (marketData.market as any)?.addresses
                ?.peggedToken as string | undefined;
              if (!peggedTokenAddress) return;

              const tokenAddressLower = peggedTokenAddress.toLowerCase();
              const walletBalance = marketData.userDeposit || 0n;

              // Include if wallet has balance (regardless of pool deposits - they are separate)
              if (walletBalance > 0n) {
                if (!walletPositionsByToken.has(tokenAddressLower)) {
                  // Use the max balance across all markets (should be same for same token)
                  // Calculate USD from the actual balance to avoid double counting
                  const balanceNum = Number(walletBalance) / 1e18;
                  // Get price for this token - use consistent price source per token, not per market
                  const pegTarget = (marketData.market as any)?.pegTarget?.toLowerCase();
                  let priceUSD = 1; // Default $1 for USD-pegged
                  
                  // Gold/Silver use Chainlink XAU/XAG spot via mergedPeggedPriceMap (1 haGOLD≈1oz gold, 1 haSILVER≈1oz silver)
                  if (pegTarget === "eur" || pegTarget === "euro") {
                    if (eurPrice) {
                      priceUSD = eurPrice;
                      if (DEBUG_ANCHOR) console.log(`[anchor page] haEUR: Using eurPrice=${eurPrice}, balanceNum=${balanceNum}, balanceUSD=${balanceNum * priceUSD}`);
                    } else {
                      if (DEBUG_ANCHOR) console.warn(`[anchor page] haEUR: eurPrice is null/undefined! Checking fallback...`);
                      // Fallback: try to get price from map, but log warning
                      const priceMarket = allMarketsData.find((md) => {
                        const mdTokenAddress = (md.market as any)?.addresses?.peggedToken?.toLowerCase();
                        return mdTokenAddress === tokenAddressLower;
                      });
                      if (priceMarket) {
                        const price = mergedPeggedPriceMap?.[priceMarket.marketId] ?? peggedPriceUSDMap?.[priceMarket.marketId];
                        if (DEBUG_ANCHOR) console.warn(`[anchor page] haEUR: priceMarket=${priceMarket.marketId}, price from map=${price?.toString() || 'undefined'}`);
                        if (price !== undefined && price > 0n) {
                          priceUSD = Number(price) / 1e18;
                          if (DEBUG_ANCHOR) console.warn(`[anchor page] haEUR: eurPrice not available, using map price=${priceUSD} for marketId=${priceMarket.marketId}`);
                        } else {
                          if (DEBUG_ANCHOR) console.warn(`[anchor page] haEUR: No price available (eurPrice=${eurPrice}, map price=${price?.toString() || 'undefined'}), using default $1`);
                        }
                      } else {
                        if (DEBUG_ANCHOR) console.warn(`[anchor page] haEUR: No priceMarket found for token ${tokenAddressLower}`);
                      }
                    }
                  } else if (pegTarget === "btc" || pegTarget === "bitcoin") {
                    // For BTC-pegged tokens, use btcPrice directly to ensure consistency across markets (same as EUR)
                    if (btcPrice) {
                      priceUSD = btcPrice;
                      if (DEBUG_ANCHOR) console.log(`[anchor page] haBTC: Using btcPrice=${btcPrice}, balanceNum=${balanceNum}, balanceUSD=${balanceNum * priceUSD}`);
                    } else {
                      // Fallback: try to get price from map
                      const priceMarket = allMarketsData.find((md) => {
                        const mdTokenAddress = (md.market as any)?.addresses?.peggedToken?.toLowerCase();
                        return mdTokenAddress === tokenAddressLower;
                      });
                      if (priceMarket) {
                        const price = mergedPeggedPriceMap?.[priceMarket.marketId] ?? peggedPriceUSDMap?.[priceMarket.marketId];
                        if (price !== undefined && price > 0n) {
                          priceUSD = Number(price) / 1e18;
                          if (DEBUG_ANCHOR) console.warn(`[anchor page] haBTC: btcPrice not available, using map price=${priceUSD} for marketId=${priceMarket.marketId}`);
                        }
                      }
                    }
                  } else if (pegTarget === "eth" || pegTarget === "ethereum") {
                    // For ETH-pegged tokens, use ethPrice directly to ensure consistency across markets
                    if (ethPrice) {
                      priceUSD = ethPrice;
                      if (DEBUG_ANCHOR) console.log(`[anchor page] haETH: Using ethPrice=${ethPrice}, balanceNum=${balanceNum}, balanceUSD=${balanceNum * priceUSD}`);
                    } else {
                      // Fallback: try to get price from map
                      const priceMarket = allMarketsData.find((md) => {
                        const mdTokenAddress = (md.market as any)?.addresses?.peggedToken?.toLowerCase();
                        return mdTokenAddress === tokenAddressLower;
                      });
                      if (priceMarket) {
                        const price = mergedPeggedPriceMap?.[priceMarket.marketId] ?? peggedPriceUSDMap?.[priceMarket.marketId];
                        if (price !== undefined && price > 0n) {
                          priceUSD = Number(price) / 1e18;
                          if (DEBUG_ANCHOR) console.warn(`[anchor page] haETH: ethPrice not available, using map price=${priceUSD} for marketId=${priceMarket.marketId}`);
                        }
                      }
                    }
                  } else {
                    // For other tokens (USD-pegged), try to get price from any market using this token
                    // Find the first market with a price for this token
                    const priceMarket = allMarketsData.find((md) => {
                      const mdTokenAddress = (md.market as any)?.addresses?.peggedToken?.toLowerCase();
                      return mdTokenAddress === tokenAddressLower;
                    });
                    if (priceMarket) {
                      const price = mergedPeggedPriceMap?.[priceMarket.marketId] ?? peggedPriceUSDMap?.[priceMarket.marketId];
                      if (price !== undefined && price > 0n) {
                        priceUSD = Number(price) / 1e18;
                      }
                    }
                  }
                  const balanceUSD = balanceNum * priceUSD;
                  
                  walletPositionsByToken.set(tokenAddressLower, {
                    tokenAddress: peggedTokenAddress,
                    symbol: marketData.market?.peggedToken?.symbol || "ha",
                    balance: walletBalance,
                    balanceUSD: balanceUSD,
                    markets: [],
                  });
                }
                const position = walletPositionsByToken.get(tokenAddressLower)!;
                // Just add this market to the list - don't recalculate anything
                // The USD value was already calculated correctly when the entry was first created
                if (DEBUG_ANCHOR) console.log(`[anchor page] Token ${tokenAddressLower} (${position.symbol}): Adding market ${marketData.marketId}, existing balanceUSD=${position.balanceUSD}, NOT recalculating`);
                position.markets.push({
                  marketId: marketData.marketId,
                  market: marketData.market,
                  marketData,
                });
                // Only update balance if it's actually higher (should be same for same token across markets)
                // But DO NOT recalculate USD - it was already calculated correctly when the entry was created
                // Recalculating would cause double counting when multiple markets use the same token
                if (walletBalance > position.balance) {
                  // This should rarely happen since same token should have same balance across markets
                  // If it does happen, maintain the same price per token to avoid inconsistencies
                  const existingPricePerToken = position.balanceUSD / (Number(position.balance) / 1e18);
                  position.balance = walletBalance;
                  if (existingPricePerToken > 0) {
                    // Use the same price per token that was used initially
                    position.balanceUSD = (Number(walletBalance) / 1e18) * existingPricePerToken;
                    if (DEBUG_ANCHOR) console.log(`[anchor page] Token ${tokenAddressLower}: Balance increased, updated USD using existing price ${existingPricePerToken}`);
                  }
                  // If existingPricePerToken is 0 or invalid, leave balanceUSD as is (shouldn't happen)
                }
                // If balance is same or lower, do nothing - USD was already calculated correctly
              }
            });

            if (walletPositionsByToken.size === 0) return null;

            return (
              <section className="mb-4 mt-4">
                <div className="space-y-2">
                  {Array.from(walletPositionsByToken.values()).map(
                    (position) => {
                    const firstMarket = position.markets[0];
                    const marketData = firstMarket.marketData;

                    return (
                      <div
                        key={position.tokenAddress}
                        className={`${HARBOR_FROSTED_INDEX_SURFACE} p-3 ${HARBOR_DATA_ROW_HOVER_CLASS}`}
                      >
                        {/* Desktop layout (>= lg) - same tracks as AnchorMarketsTableHeader */}
                        <div className={ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME}>
                          <div className="min-w-0" aria-hidden />
                          {/* Token */}
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5 min-w-0">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span
                                className="text-[#1E4775] font-medium text-sm lg:text-base truncate min-w-0"
                                title={position.symbol}
                              >
                                {position.symbol}
                              </span>
                              <span className="shrink-0">
                                <WalletPositionInactiveTag />
                              </span>
                            </div>
                          </div>

                          {/* Deposit Assets - Info text */}
                          <div className="text-center min-w-0">
                            <span className="text-xs text-[#1E4775]/60 whitespace-nowrap">
                              Deposit in a stability pool to earn yield
                            </span>
                          </div>

                          {/* APR - empty */}
                          <div></div>

                          {/* Earnings - empty */}
                          <div></div>

                          {/* Reward Assets - empty */}
                          <div></div>

                          {/* Position */}
                          <div className="flex min-w-0 flex-col items-center justify-center text-center">
                            <span className="text-[#1E4775] font-medium text-xs font-mono">
                                {formatToken(position.balance)}{" "}
                                {position.symbol} (
                                {formatCompactUSD(position.balanceUSD)})
                            </span>
                          </div>

                          {/* Actions */}
                          <div
                            className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                  const enrichedMarkets = position.markets.map(
                                    (m) => ({
                                  marketId: m.marketId,
                                  market: {
                                    ...m.market,
                                    wrappedRate: m.marketData?.wrappedRate,
                                  },
                                    })
                                  );
                                void openManageModal({
                                  marketId: firstMarket.marketId,
                                  market: {
                                    ...firstMarket.market,
                                    wrappedRate: marketData?.wrappedRate,
                                  },
                                  initialTab: "deposit",
                                  simpleMode: true,
                                  bestPoolType: "collateral",
                                  allMarkets: enrichedMarkets,
                                  // Default the modal deposit-asset selector to the ha token.
                                  // (Some flows otherwise default to collateral, which is confusing here.)
                                    initialDepositAsset:
                                      firstMarket.market?.peggedToken?.symbol ||
                                      position.symbol,
                                });
                              }}
                              className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
                            >
                              Manage
                            </button>
                          </div>
                        </div>

                        {/* Medium/narrow layout (md to < lg) */}
                        <div className={ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME}>
                          <div className="min-w-0" aria-hidden />
                          {/* Token */}
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5 min-w-0">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span
                                className="text-[#1E4775] font-medium text-sm truncate min-w-0"
                                title={position.symbol}
                              >
                                {position.symbol}
                              </span>
                              <span className="shrink-0">
                                <WalletPositionInactiveTag />
                              </span>
                            </div>
                          </div>

                          {/* APR - Info text */}
                          <div className="text-center min-w-0">
                            <span className="text-xs text-[#1E4775]/60 whitespace-nowrap">
                              Deposit in a stability pool to earn yield
                            </span>
                          </div>

                          {/* Position */}
                          <div className="flex min-w-0 flex-col items-center justify-center text-center">
                            <span className="text-[#1E4775] font-medium text-xs font-mono">
                                {formatToken(position.balance)}{" "}
                                {position.symbol} (
                                {formatCompactUSD(position.balanceUSD)})
                            </span>
                          </div>

                          {/* Actions */}
                          <div
                            className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                  const enrichedMarkets = position.markets.map(
                                    (m) => ({
                                  marketId: m.marketId,
                                  market: {
                                    ...m.market,
                                    wrappedRate: m.marketData?.wrappedRate,
                                  },
                                    })
                                  );
                                  void openManageModal({
                                    marketId: firstMarket.marketId,
                                    market: {
                                      ...firstMarket.market,
                                      wrappedRate: marketData?.wrappedRate,
                                    },
                                    initialTab: "deposit",
                                    simpleMode: true,
                                    bestPoolType: "collateral",
                                    allMarkets: enrichedMarkets,
                                    initialDepositAsset:
                                      firstMarket.market?.peggedToken?.symbol ||
                                      position.symbol,
                                  });
                                }}
                                className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
                              >
                                Manage
                              </button>
                            </div>
                          </div>

                          {/* Mobile layout (< md) */}
                        <div className="md:hidden space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775] font-medium text-sm truncate min-w-0">
                                {position.symbol}
                              </span>
                              <span className="shrink-0">
                                <WalletPositionInactiveTag />
                              </span>
                              <span className="text-xs text-[#1E4775]/60 hidden sm:inline ml-2 whitespace-nowrap">
                                Deposit in a stability pool to earn yield
                              </span>
                            </div>
                            <div
                              className="flex items-center justify-end flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                    const enrichedMarkets =
                                      position.markets.map((m) => ({
                                    marketId: m.marketId,
                                    market: {
                                      ...m.market,
                                          wrappedRate:
                                            m.marketData?.wrappedRate,
                                    },
                                  }));
                                  void openManageModal({
                                    marketId: firstMarket.marketId,
                                    market: {
                                      ...firstMarket.market,
                                      wrappedRate: marketData?.wrappedRate,
                                    },
                                    initialTab: "deposit",
                                    simpleMode: true,
                                    bestPoolType: "collateral",
                                    allMarkets: enrichedMarkets,
                                    initialDepositAsset:
                                        firstMarket.market?.peggedToken
                                          ?.symbol || position.symbol,
                                  });
                                }}
                                className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[#1E4775]/60 font-mono">
                              {formatToken(position.balance)} {position.symbol}{" "}
                              ({formatCompactUSD(position.balanceUSD)})
                            </span>
                          </div>
                          <div className="text-xs text-[#1E4775]/60 sm:hidden">
                            Deposit in a stability pool to earn yield
                          </div>
                        </div>
                      </div>
                    );
                    }
                  )}
                </div>

              </section>
            );
}
