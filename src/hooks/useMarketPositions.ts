"use client";

import { useMemo } from "react";
import { useContractReads } from "./useContractReads";
import { ERC20_ABI, STABILITY_POOL_ABI, MINTER_ABI } from "@/abis/shared";

export type MarketPositionBreakdown = {
  walletHa: bigint;
  collateralPool: bigint;
  sailPool: bigint;
  total: bigint;
  peggedTokenPrice?: bigint;
  // USD values
  walletHaUSD: number;
  collateralPoolUSD: number;
  sailPoolUSD: number;
  totalUSD: number;
};

export type MarketPositionsMap = Record<string, MarketPositionBreakdown>;

export interface MarketConfig {
  marketId: string;
  peggedTokenAddress?: `0x${string}`;
  collateralPoolAddress?: `0x${string}`;
  sailPoolAddress?: `0x${string}`;
  minterAddress?: `0x${string}`; // Added to fetch peggedTokenPrice directly
}

/**
 * Hook to fetch all position data for markets in a single batch.
 * Returns a map of marketId -> position breakdown.
 * 
 * Uses:
 * - ERC20 balanceOf for wallet ha token balance
 * - Stability pool assetBalanceOf for pool deposits
 */
export function useMarketPositions(
  marketConfigs: MarketConfig[],
  userAddress?: `0x${string}`,
  externalPriceMap?: Record<string, bigint | undefined>
) {
  // Build contract calls for all markets
  const { contracts, indexMap } = useMemo(() => {
    if (!userAddress || marketConfigs.length === 0) {
      return { 
        contracts: [] as any[], 
        indexMap: new Map<number, { marketId: string; kind: "walletHa" | "collateralPool" | "sailPool" | "price" }>() 
      };
    }

    const items: any[] = [];
    const idxMap = new Map<number, { marketId: string; kind: "walletHa" | "collateralPool" | "sailPool" | "price" }>();

    marketConfigs.forEach((config) => {
      // Wallet ha token balance (ERC20 balanceOf)
      if (config.peggedTokenAddress) {
        idxMap.set(items.length, { marketId: config.marketId, kind: "walletHa" });
        items.push({
          address: config.peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress],
        });
      }
      // Collateral pool deposit (stability pool assetBalanceOf)
      if (config.collateralPoolAddress) {
        idxMap.set(items.length, { marketId: config.marketId, kind: "collateralPool" });
        items.push({
          address: config.collateralPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "assetBalanceOf",
          args: [userAddress],
        });
      }
      // Sail pool deposit (stability pool assetBalanceOf)
      if (config.sailPoolAddress) {
        idxMap.set(items.length, { marketId: config.marketId, kind: "sailPool" });
        items.push({
          address: config.sailPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "assetBalanceOf",
          args: [userAddress],
        });
      }
      // Fetch peggedTokenPrice from minter for USD calculation
      if (config.minterAddress) {
        idxMap.set(items.length, { marketId: config.marketId, kind: "price" });
        items.push({
          address: config.minterAddress,
          abi: MINTER_ABI,
          functionName: "peggedTokenPrice",
        });
      }
    });

    return { contracts: items, indexMap: idxMap };
  }, [marketConfigs, userAddress]);

  const hookEnabled = !!userAddress && contracts.length > 0;

  const { data, isLoading, error, refetch } = useContractReads({
    contracts,
    enabled: hookEnabled,
    refetchInterval: 15000, // 15 second refresh
  });

  // Build positions map from results
  const positionsMap = useMemo((): MarketPositionsMap => {
    const map: MarketPositionsMap = {};

    // First pass: collect prices from minter reads, merge with external map
    const priceMap = new Map<string, bigint | undefined>();
    if (externalPriceMap) {
      Object.entries(externalPriceMap).forEach(([marketId, price]) => {
        priceMap.set(marketId, price);
      });
    }
    if (data) {
      data.forEach((result, idx) => {
        const meta = indexMap.get(idx);
        if (meta?.kind === "price" && result?.result !== undefined && result?.result !== null) {
          priceMap.set(meta.marketId, BigInt(result.result as bigint));
        }
      });
    }

    // Initialize all markets with default values
    marketConfigs.forEach((config) => {
      map[config.marketId] = {
        walletHa: 0n,
        collateralPool: 0n,
        sailPool: 0n,
        total: 0n,
        peggedTokenPrice: undefined,
        walletHaUSD: 0,
        collateralPoolUSD: 0,
        sailPoolUSD: 0,
        totalUSD: 0,
      };
    });

    // Second pass: populate balances
    if (data) {
      data.forEach((result, idx) => {
        const meta = indexMap.get(idx);
        if (!meta || meta.kind === "price") return;

        const val =
          result?.status === "success" && result.result !== undefined
            ? BigInt(result.result as bigint)
            : 0n;

        if (map[meta.marketId]) {
          (map[meta.marketId] as any)[meta.kind] = val;
        }
      });
    }

    // Calculate totals and USD values
    marketConfigs.forEach((config) => {
      const pos = map[config.marketId];
      if (!pos) return;

      pos.total = pos.walletHa + pos.collateralPool + pos.sailPool;

      const peggedTokenPrice = priceMap.get(config.marketId);
      pos.peggedTokenPrice = peggedTokenPrice;

      if (peggedTokenPrice !== undefined) {
        const priceUSD = Number(peggedTokenPrice) / 1e18;
        pos.walletHaUSD = (Number(pos.walletHa) / 1e18) * priceUSD;
        pos.collateralPoolUSD = (Number(pos.collateralPool) / 1e18) * priceUSD;
        pos.sailPoolUSD = (Number(pos.sailPool) / 1e18) * priceUSD;
        pos.totalUSD = pos.walletHaUSD + pos.collateralPoolUSD + pos.sailPoolUSD;
      } else {
        // If price missing, keep USD as 0 to signal unavailable
        pos.walletHaUSD = 0;
        pos.collateralPoolUSD = 0;
        pos.sailPoolUSD = 0;
        pos.totalUSD = 0;
      }
    });

    return map;
  }, [data, indexMap, marketConfigs, externalPriceMap]);

  // Get total position across all markets
  const totalPositionUSD = useMemo(() => {
    return Object.values(positionsMap).reduce(
      (sum, pos) => sum + (pos.totalUSD || 0),
      0
    );
  }, [positionsMap]);

  // Check if user has any positions
  const hasPositions = useMemo(() => {
    return Object.values(positionsMap).some((pos) => pos.total > 0n);
  }, [positionsMap]);

  return {
    positionsMap,
    totalPositionUSD,
    hasPositions,
    isLoading,
    error,
    refetch,
  };
}
