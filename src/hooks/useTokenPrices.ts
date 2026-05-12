import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { minterABI } from "@/abis/minter";
import { WRAPPED_PRICE_ORACLE_ABI } from "@/abis/shared";
import { HS_FALLBACK_ORACLES_MAINNET } from "@/config/hsFallbackOracles";
import type { TokenPriceInput } from "@/utils/tokenPriceInput";
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
  markets: TokenPriceInput[]
): Record<string, TokenPricesResult> {
  const pegTargetPrices = usePegTargetPrices();
  const resolvePegTargetUSD = (targetRaw: string): number => {
    const target = targetRaw.toLowerCase();
    if (target === "usd" || target === "fxusd") return 1.0;
    if (target === "btc" || target === "bitcoin")
      return pegTargetPrices.btcPrice ?? 0;
    if (target === "eth" || target === "ethereum")
      return pegTargetPrices.ethPrice ?? 0;
    if (target === "eur" || target === "euro")
      return pegTargetPrices.eurPrice ?? 0;
    if (target === "gold") return pegTargetPrices.goldPrice ?? 0;
    if (target === "silver") return pegTargetPrices.silverPrice ?? 0;
    return 0;
  };

  const minterContracts = useMemo(() => {
    return markets.flatMap((market) => {
      const chainId = market.chainId ?? 1;
      return [
        {
          address: market.minterAddress,
          abi: minterABI,
          functionName: "peggedTokenPrice" as const,
          chainId,
        },
        {
          address: market.minterAddress,
          abi: minterABI,
          functionName: "leveragedTokenPrice" as const,
          chainId,
        },
      ];
    });
  }, [markets]);

  const { data: tokenPriceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts: minterContracts,
    query: {
      enabled: minterContracts.length > 0,
      allowFailure: true,
    },
  });

  const { fallbackOracleContracts, fallbackOracleIndexByMarketId } = useMemo(() => {
    const contracts: Array<{
      address: `0x${string}`;
      abi: typeof WRAPPED_PRICE_ORACLE_ABI;
      functionName: "latestAnswer";
      chainId: number;
    }> = [];
    const indexByMarketId = new Map<string, number>();

    markets.forEach((market) => {
      const fallbackOracle = HS_FALLBACK_ORACLES_MAINNET[market.marketId];
      if (!fallbackOracle) return;
      indexByMarketId.set(market.marketId, contracts.length);
      contracts.push({
        address: fallbackOracle,
        abi: WRAPPED_PRICE_ORACLE_ABI,
        functionName: "latestAnswer" as const,
        chainId: 1,
      });
    });

    return {
      fallbackOracleContracts: contracts,
      fallbackOracleIndexByMarketId: indexByMarketId,
    };
  }, [markets]);

  const shouldQueryFallbackOracles = useMemo(() => {
    if (isPriceLoading) return false;
    if (priceError) return true;

    return markets.some((market, idx) => {
      if (!HS_FALLBACK_ORACLES_MAINNET[market.marketId]) return false;
      const leveragedRaw = tokenPriceData?.[idx * 2 + 1]?.result as
        | bigint
        | undefined;
      if (leveragedRaw == null) return true;

      const pegTargetUSD = resolvePegTargetUSD(market.pegTarget);
      const leveragedPriceInPegUnits = Number(formatUnits(leveragedRaw, 18));
      const primaryLeveragedPriceUSD = leveragedPriceInPegUnits * pegTargetUSD;
      return (
        !Number.isFinite(primaryLeveragedPriceUSD) ||
        primaryLeveragedPriceUSD <= 0
      );
    });
  }, [isPriceLoading, priceError, markets, tokenPriceData, pegTargetPrices]);

  const {
    data: fallbackOracleData,
    isLoading: isFallbackOracleLoading,
    error: fallbackOracleError,
  } = useReadContracts({
    contracts: fallbackOracleContracts,
    query: {
      enabled: fallbackOracleContracts.length > 0 && shouldQueryFallbackOracles,
      allowFailure: true,
    },
  });

  return useMemo(() => {
    const result: Record<string, TokenPricesResult> = {};

    markets.forEach((market, idx) => {
      const baseOffset = idx * 2;
      const peggedResult = tokenPriceData?.[baseOffset];
      const leveragedResult = tokenPriceData?.[baseOffset + 1];
      const fallbackIndex = fallbackOracleIndexByMarketId.get(market.marketId);
      const fallbackOracleRead =
        fallbackIndex !== undefined ? fallbackOracleData?.[fallbackIndex] : undefined;

      const pegTargetUSD = resolvePegTargetUSD(market.pegTarget);

      const peggedRaw = peggedResult?.result as bigint | undefined;
      const leveragedRaw = leveragedResult?.result as bigint | undefined;

      let fallbackLeveragedPriceUSD = 0;
      const fallbackTuple = fallbackOracleRead?.result;
      if (Array.isArray(fallbackTuple) && fallbackTuple.length >= 2) {
        const maxUnderlyingPrice = fallbackTuple[1];
        const minUnderlyingPrice = fallbackTuple[0];
        if (typeof maxUnderlyingPrice === "bigint" && maxUnderlyingPrice > 0n) {
          fallbackLeveragedPriceUSD = Number(formatUnits(maxUnderlyingPrice, 18));
        } else if (
          typeof minUnderlyingPrice === "bigint" &&
          minUnderlyingPrice > 0n
        ) {
          fallbackLeveragedPriceUSD = Number(formatUnits(minUnderlyingPrice, 18));
        }
      }

      if (peggedRaw == null || leveragedRaw == null) {
        result[market.marketId] = {
          peggedBackingRatio: 0,
          peggedPriceUSD: 0,
          leveragedPriceUSD: fallbackLeveragedPriceUSD,
          pegTargetUSD,
          isDepegged: false,
          isLoading: isPriceLoading || isFallbackOracleLoading,
          error: !!priceError || !!fallbackOracleError,
        };
        return;
      }

      const peggedBackingRatio = Number(formatUnits(peggedRaw, 18));
      const leveragedPriceInPegUnits = Number(formatUnits(leveragedRaw, 18));
      const primaryLeveragedPriceUSD = leveragedPriceInPegUnits * pegTargetUSD;
      const leveragedPriceUSD =
        primaryLeveragedPriceUSD > 0
          ? primaryLeveragedPriceUSD
          : fallbackLeveragedPriceUSD;

      result[market.marketId] = {
        peggedBackingRatio,
        peggedPriceUSD: peggedBackingRatio * pegTargetUSD,
        leveragedPriceUSD,
        pegTargetUSD,
        isDepegged: peggedBackingRatio < 1.0,
        isLoading: isPriceLoading || isFallbackOracleLoading,
        error: !!priceError || !!fallbackOracleError,
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
    fallbackOracleData,
    fallbackOracleIndexByMarketId,
    shouldQueryFallbackOracles,
    isFallbackOracleLoading,
    fallbackOracleError,
  ]);
}
