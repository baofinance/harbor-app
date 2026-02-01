import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { minterABI } from "@/abis/minter";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";
import { useCoinGeckoPrices } from "./useCoinGeckoPrice";

interface TokenPricesResult {
  peggedBackingRatio: number; // Health indicator (1.0 = healthy)
  peggedPriceUSD: number; // Actual USD price of ha token
  leveragedPriceUSD: number; // Actual USD price of hs token
  pegTargetUSD: number; // USD price of peg target
  isDepegged: boolean; // True if backing ratio < 1.0
  isLoading: boolean;
  error: boolean;
}

interface MarketTokenPriceInput {
  marketId: string;
  minterAddress: `0x${string}`;
  pegTarget: string;
}

/**
 * Hook to fetch ha and hs token prices in USD for multiple markets
 * 
 * How it works:
 * 1. Reads peggedTokenPrice() and leveragedTokenPrice() from Minter contracts
 *    - These return prices denominated in the peg target (USD, BTC, ETH)
 * 2. Gets the USD price of the peg targets (Priority: CoinGecko → Chainlink)
 * 3. Multiplies to get final USD prices:
 *    - haTokenPriceUSD = peggedTokenPrice × pegTargetUSD
 *    - hsTokenPriceUSD = leveragedTokenPrice × pegTargetUSD
 */
export function useMultipleTokenPrices(
  markets: MarketTokenPriceInput[]
): Record<string, TokenPricesResult> {
  // Build minter contract calls for all markets
  const minterContracts = useMemo(() => {
    return markets.flatMap((market) => [
      {
        address: market.minterAddress,
        abi: minterABI,
        functionName: "peggedTokenPrice" as const,
      },
      {
        address: market.minterAddress,
        abi: minterABI,
        functionName: "leveragedTokenPrice" as const,
      },
    ]);
  }, [markets]);

  // Determine which Chainlink feeds we need
  const needsChainlink = useMemo(() => {
    const needs = { eth: false, btc: false, eur: false };
    markets.forEach((market) => {
      const target = market.pegTarget.toLowerCase();
      if (target === "eth" || target === "ethereum") needs.eth = true;
      if (target === "btc" || target === "bitcoin") needs.btc = true;
      if (target === "eur" || target === "euro") needs.eur = true;
    });
    return needs;
  }, [markets]);

  // Build Chainlink contract calls (only if needed)
  const chainlinkContracts = useMemo(() => {
    const contracts: any[] = [];
    if (needsChainlink.eth) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "decimals" as const,
        },
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "latestRoundData" as const,
        }
      );
    }
    if (needsChainlink.btc) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "decimals" as const,
        },
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "latestRoundData" as const,
        }
      );
    }
    if (needsChainlink.eur) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.EUR_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "decimals" as const,
        },
        {
          address: CHAINLINK_FEEDS.EUR_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "latestAnswer" as const,
        }
      );
    }
    return contracts;
  }, [needsChainlink]);

  // Read minter token prices
  const { data: tokenPriceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts: minterContracts,
    query: {
      enabled: minterContracts.length > 0,
    },
  });

  // Read Chainlink prices
  const { data: chainlinkData } = useReadContracts({
    contracts: chainlinkContracts,
    query: {
      enabled: chainlinkContracts.length > 0,
    },
  });

  // Get CoinGecko prices for peg targets
  const coinGeckoIds = useMemo(() => {
    const uniqueTargets = new Set<string>();
    markets.forEach((market) => {
      const target = market.pegTarget.toLowerCase();
      if (target === "btc" || target === "bitcoin") {
        uniqueTargets.add("bitcoin");
      } else if (target === "eth" || target === "ethereum") {
        uniqueTargets.add("ethereum");
      } else if (target === "eur" || target === "euro") {
        uniqueTargets.add("stasis-euro");
      }
    });
    return Array.from(uniqueTargets);
  }, [markets]);

  const coinGeckoPrices = useCoinGeckoPrices(coinGeckoIds);

  // Parse Chainlink prices
  const chainlinkPrices = useMemo(() => {
    const prices: { eth?: number; btc?: number; eur?: number } = {};
    if (!chainlinkData) return prices;

    let offset = 0;
    
    // Parse ETH if requested
    if (needsChainlink.eth && chainlinkData.length >= offset + 2) {
      const decimalsResult = chainlinkData[offset];
      const roundDataResult = chainlinkData[offset + 1];
      
      if (decimalsResult?.status === "success" && roundDataResult?.status === "success") {
        const decimals = decimalsResult.result as number;
        const roundData = roundDataResult.result as any[];
        if (roundData && roundData[1]) {
          const price = Number(roundData[1]) / 10 ** decimals;
          prices.eth = price > 0 ? price : undefined;
        }
      }
      offset += 2;
    }

    // Parse BTC if requested
    if (needsChainlink.btc && chainlinkData.length >= offset + 2) {
      const decimalsResult = chainlinkData[offset];
      const roundDataResult = chainlinkData[offset + 1];
      
      if (decimalsResult?.status === "success" && roundDataResult?.status === "success") {
        const decimals = decimalsResult.result as number;
        const roundData = roundDataResult.result as any[];
        if (roundData && roundData[1]) {
          const price = Number(roundData[1]) / 10 ** decimals;
          prices.btc = price > 0 ? price : undefined;
        }
      }
      offset += 2;
    }

    // Parse EUR if requested (uses latestAnswer, not latestRoundData)
    // NOTE: The Chainlink feed 0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353 returns EUR per USD
    // (e.g., 0.93 EUR per 1 USD). We need to invert it to get USD per EUR for our calculation.
    // Example: If feed returns 0.93 (EUR per USD), we invert to get 1/0.93 = 1.075 (USD per EUR)
    if (needsChainlink.eur && chainlinkData.length >= offset + 2) {
      const decimalsResult = chainlinkData[offset];
      const answerResult = chainlinkData[offset + 1];
      
      // If answer succeeded, try to parse it (even if decimals failed)
      if (answerResult?.status === "success") {
        const answer = answerResult.result as bigint;
        if (answer !== undefined && answer !== null) {
          // Get decimals if available, otherwise default to 8 (standard Chainlink)
          let decimals = 8; // Default to 8 decimals for Chainlink feeds
          if (decimalsResult?.status === "success") {
            decimals = decimalsResult.result as number;
          }
          
          // Try 8 decimals first (standard Chainlink format)
          let eurPerUsd = Number(answer) / 10 ** 8;
          
          // The feed returns EUR per USD (e.g., 0.93 EUR per 1 USD)
          // We need USD per EUR, so we invert: 1 / eurPerUsd
          // This should give us a value > 1.0 (typically ~1.08, but can be < 1.0 if EUR drops)
          if (eurPerUsd > 0 && eurPerUsd < 10.0) {
            const usdPerEur = 1 / eurPerUsd;
            prices.eur = usdPerEur;
            if (process.env.NODE_ENV === "development") {
              console.log(`[useTokenPrices] EUR Chainlink price (8dec, inverted):`, {
                rawAnswer: answer.toString(),
                eurPerUsd,
                usdPerEur,
                interpretation: 'EUR/USD (inverted from EUR per USD)',
              });
            }
          } else {
            // Try 18 decimals in case it's a different format
            eurPerUsd = Number(answer) / 10 ** 18;
            if (eurPerUsd > 0 && eurPerUsd < 10.0) {
              const usdPerEur = 1 / eurPerUsd;
              prices.eur = usdPerEur;
              if (process.env.NODE_ENV === "development") {
                console.log(`[useTokenPrices] EUR Chainlink price (18dec, inverted):`, {
                  rawAnswer: answer.toString(),
                  eurPerUsd,
                  usdPerEur,
                  interpretation: 'EUR/USD (inverted from EUR per USD)',
                });
              }
            } else {
              if (process.env.NODE_ENV === "development") {
                console.warn(`[useTokenPrices] EUR Chainlink price out of range:`, {
                  eurPerUsd8dec: Number(answer) / 10 ** 8,
                  eurPerUsd18dec: Number(answer) / 10 ** 18,
                  rawAnswer: answer.toString(),
                });
              }
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[useTokenPrices] EUR Chainlink answer missing:`, {
              answer,
              hasAnswer: answer !== undefined && answer !== null,
            });
          }
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[useTokenPrices] EUR Chainlink read failed:`, {
            decimalsStatus: decimalsResult?.status,
            answerStatus: answerResult?.status,
            decimalsError: decimalsResult?.error,
            answerError: answerResult?.error,
          });
        }
      }
    }

    return prices;
  }, [chainlinkData, needsChainlink]);

  // Calculate USD prices for each market
  return useMemo(() => {
    const result: Record<string, TokenPricesResult> = {};

    markets.forEach((market, idx) => {
      const baseOffset = idx * 2;
      const peggedResult = tokenPriceData?.[baseOffset];
      const leveragedResult = tokenPriceData?.[baseOffset + 1];

      // Get peg target USD price (Priority: CoinGecko → Chainlink → 0)
      const target = market.pegTarget.toLowerCase();
      let pegTargetUSD = 0;
      
      if (target === "usd" || target === "fxusd") {
        pegTargetUSD = 1.0;
      } else if (target === "btc" || target === "bitcoin") {
        // Try CoinGecko first, fall back to Chainlink
        pegTargetUSD = 
          coinGeckoPrices.prices?.["bitcoin"] || 
          chainlinkPrices.btc || 
          0;
      } else if (target === "eth" || target === "ethereum") {
        // Try CoinGecko first, fall back to Chainlink
        pegTargetUSD = 
          coinGeckoPrices.prices?.["ethereum"] || 
          chainlinkPrices.eth || 
          0;
      } else if (target === "eur" || target === "euro") {
        // Try Chainlink first (same feed as used in useAnchorPrices), fall back to CoinGecko
        pegTargetUSD = 
          chainlinkPrices.eur || 
          coinGeckoPrices.prices?.["stasis-euro"] || 
          0;
        
        // Debug logging for EUR markets
        if (process.env.NODE_ENV === "development") {
          console.log(`[useTokenPrices] EUR market ${market.marketId}:`, {
            target,
            chainlinkEur: chainlinkPrices.eur,
            coinGeckoEur: coinGeckoPrices.prices?.["stasis-euro"],
            finalPegTargetUSD: pegTargetUSD,
          });
        }
      }

      // Check if minter data is available
      if (!peggedResult?.result || !leveragedResult?.result) {
        result[market.marketId] = {
          peggedBackingRatio: 0,
          peggedPriceUSD: 0,
          leveragedPriceUSD: 0,
          pegTargetUSD,
          isDepegged: false,
          isLoading: isPriceLoading,
          error: !!priceError,
        };
        return;
      }

      // Parse token prices (in peg target units)
      const peggedBackingRatio = Number(
        formatUnits(peggedResult.result as bigint, 18)
      );
      const leveragedPriceInPegUnits = Number(
        formatUnits(leveragedResult.result as bigint, 18)
      );

      // Calculate USD prices: tokenPrice × pegTargetUSD
      result[market.marketId] = {
        peggedBackingRatio,
        peggedPriceUSD: peggedBackingRatio * pegTargetUSD,
        leveragedPriceUSD: leveragedPriceInPegUnits * pegTargetUSD,
        pegTargetUSD,
        isDepegged: peggedBackingRatio < 1.0,
        isLoading: isPriceLoading,
        error: !!priceError,
      };
    });

    return result;
  }, [markets, tokenPriceData, coinGeckoPrices, chainlinkPrices, isPriceLoading, priceError]);
}

