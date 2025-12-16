"use client";

import { useMemo } from "react";
import { useContractReads } from "./useContractReads";
import { MINTER_ABI } from "@/abis/shared";

export interface PeggedPriceConfig {
  marketId: string;
  minterAddress?: `0x${string}`;
}

export interface PeggedPriceResult {
  priceMap: Record<string, bigint | undefined>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Fetch pegged token prices (peggedTokenPrice) for the provided markets.
 * This hook batches reads via useContractReads.
 */
export function usePeggedTokenPrices(
  configs: PeggedPriceConfig[],
  enabled: boolean
): PeggedPriceResult {
  const { contracts, indexMap } = useMemo(() => {
    const items: any[] = [];
    const map = new Map<number, string>();

    configs.forEach((cfg) => {
      if (
        cfg.minterAddress &&
        cfg.minterAddress.startsWith("0x") &&
        cfg.minterAddress.length === 42
      ) {
        map.set(items.length, cfg.marketId);
        items.push({
          address: cfg.minterAddress,
          abi: MINTER_ABI,
          functionName: "peggedTokenPrice",
        });
      }
    });

    return { contracts: items, indexMap: map };
  }, [configs]);

  const { data, isLoading, error, refetch } = useContractReads({
    contracts,
    enabled: enabled && contracts.length > 0,
    refetchInterval: 15000,
  });

  const priceMap = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    if (data) {
      data.forEach((result, idx) => {
        const marketId = indexMap.get(idx);
        if (!marketId) return;
        if (result?.status === "success" && result.result !== undefined) {
          map[marketId] = BigInt(result.result as bigint);
        } else {
          map[marketId] = undefined;
        }
      });
    }
    return map;
  }, [data, indexMap]);

  return {
    priceMap,
    isLoading,
    error,
    refetch,
  };
}







