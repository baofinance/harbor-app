import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { minterABI } from "@/abis/minter";
import { usePegTargetPrices } from "./usePegTargetPrices";

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
 * Hook to fetch ha and hs token prices in USD for multiple markets.
 * Uses central usePegTargetPrices for ETH, BTC, EUR, gold, silver - single source of truth.
 *
 * How it works:
 * 1. Reads peggedTokenPrice() and leveragedTokenPrice() from Minter contracts
 * 2. Gets peg target USD from usePegTargetPrices (central)
 * 3. Multiplies: haTokenPriceUSD = peggedTokenPrice × pegTargetUSD, etc.
 */
export function useMultipleTokenPrices(
  markets: MarketTokenPriceInput[]
): Record<string, TokenPricesResult> {
  const pegTargetPrices = usePegTargetPrices();

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

  const { data: tokenPriceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts: minterContracts,
    query: {
      enabled: minterContracts.length > 0,
    },
  });

  return useMemo(() => {
    const result: Record<string, TokenPricesResult> = {};

    markets.forEach((market, idx) => {
      const baseOffset = idx * 2;
      const peggedResult = tokenPriceData?.[baseOffset];
      const leveragedResult = tokenPriceData?.[baseOffset + 1];

      const target = market.pegTarget.toLowerCase();
      let pegTargetUSD = 0;

      if (target === "usd" || target === "fxusd") {
        pegTargetUSD = 1.0;
      } else if (target === "btc" || target === "bitcoin") {
        pegTargetUSD = pegTargetPrices.btcPrice ?? 0;
      } else if (target === "eth" || target === "ethereum") {
        pegTargetUSD = pegTargetPrices.ethPrice ?? 0;
      } else if (target === "eur" || target === "euro") {
        pegTargetUSD = pegTargetPrices.eurPrice ?? 0;
      } else if (target === "gold") {
        pegTargetUSD = pegTargetPrices.goldPrice ?? 0;
      } else if (target === "silver") {
        pegTargetUSD = pegTargetPrices.silverPrice ?? 0;
      }

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

      const peggedBackingRatio = Number(formatUnits(peggedResult.result as bigint, 18));
      const leveragedPriceInPegUnits = Number(formatUnits(leveragedResult.result as bigint, 18));

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
  }, [
    markets,
    tokenPriceData,
    pegTargetPrices.btcPrice,
    pegTargetPrices.ethPrice,
    pegTargetPrices.eurPrice,
    pegTargetPrices.goldPrice,
    pegTargetPrices.silverPrice,
    isPriceLoading,
    priceError,
  ]);
}
