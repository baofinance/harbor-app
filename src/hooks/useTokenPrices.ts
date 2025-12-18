import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { minterABI } from "@/abis/minter";
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
 * 2. Gets the USD price of the peg targets (BTC, ETH)
 * 3. Multiplies to get final USD prices:
 *    - haTokenPriceUSD = peggedTokenPrice × pegTargetUSD
 *    - hsTokenPriceUSD = leveragedTokenPrice × pegTargetUSD
 */
export function useMultipleTokenPrices(
  markets: MarketTokenPriceInput[]
): Record<string, TokenPricesResult> {
  // Build contract calls for all markets
  const contracts = useMemo(() => {
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

  // Read all token prices at once
  const { data: tokenPriceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  // Get unique peg targets that need price fetching
  const coinGeckoIds = useMemo(() => {
    const uniqueTargets = new Set<string>();
    markets.forEach((market) => {
      const target = market.pegTarget.toLowerCase();
      if (target === "btc" || target === "bitcoin") {
        uniqueTargets.add("bitcoin");
      } else if (target === "eth" || target === "ethereum") {
        uniqueTargets.add("ethereum");
      }
    });
    return Array.from(uniqueTargets);
  }, [markets]);

  // Fetch all needed peg target prices
  const coinGeckoPrices = useCoinGeckoPrices(coinGeckoIds);

  // Calculate USD prices for each market
  return useMemo(() => {
    const result: Record<string, TokenPricesResult> = {};

    markets.forEach((market, idx) => {
      const baseOffset = idx * 2;
      const peggedResult = tokenPriceData?.[baseOffset];
      const leveragedResult = tokenPriceData?.[baseOffset + 1];

      // Get peg target USD price
      const target = market.pegTarget.toLowerCase();
      let pegTargetUSD = 0;
      
      if (target === "usd" || target === "fxusd") {
        pegTargetUSD = 1.0;
      } else if (target === "btc" || target === "bitcoin") {
        pegTargetUSD = coinGeckoPrices.prices?.["bitcoin"] || 0;
      } else if (target === "eth" || target === "ethereum") {
        pegTargetUSD = coinGeckoPrices.prices?.["ethereum"] || 0;
      }

      // Check if data is available
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

      // Calculate USD prices
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
  }, [markets, tokenPriceData, coinGeckoPrices, isPriceLoading, priceError]);
}

