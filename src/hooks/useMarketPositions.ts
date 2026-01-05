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
  const isDebug = process.env.NODE_ENV === "development";
  // Debug: log the address being used
  if (isDebug) {
    console.log("[useMarketPositions] userAddress:", userAddress);
    console.log(
      "[useMarketPositions] externalPriceMap:",
      externalPriceMap ? Object.keys(externalPriceMap) : "none"
    );
  }
  
  // Build contract calls for all markets
  const { contracts, indexMap } = useMemo(() => {
    if (!userAddress || marketConfigs.length === 0) {
      if (isDebug) {
        console.log("[useMarketPositions] No userAddress or marketConfigs, skipping");
      }
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
    query: {
      enabled: hookEnabled,
      refetchInterval: 15000, // 15 second refresh
      staleTime: 30_000, // 30 seconds - consider data fresh for 30s to prevent unnecessary refetches
      gcTime: 300_000, // 5 minutes - keep in cache for 5 minutes
      structuralSharing: true, // Only update if values actually changed
      retry: 2, // Retry up to 2 times on failure
      retryDelay: 1000, // Wait 1 second between retries
    },
  });

  // Build positions map from results
  const positionsMap = useMemo((): MarketPositionsMap => {
    const map: MarketPositionsMap = {};

    // First pass: collect prices from minter reads, merge with external map
    // IMPORTANT: externalPriceMap contains USD prices, so it takes precedence over minter prices (which are in collateral units)
    const priceMap = new Map<string, bigint | undefined>();
    if (externalPriceMap) {
      Object.entries(externalPriceMap).forEach(([marketId, price]) => {
        if (price !== undefined) {
          priceMap.set(marketId, price);
        }
      });
    }
    // Only add minter prices if we don't already have a price from externalPriceMap (which is in USD)
    if (data) {
      data.forEach((result, idx) => {
        const meta = indexMap.get(idx);
        if (meta?.kind === "price" && result?.result !== undefined && result?.result !== null) {
          // Only use minter price if we don't already have an external USD price
          if (!priceMap.has(meta.marketId)) {
            priceMap.set(meta.marketId, BigInt(result.result as bigint));
          }
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
          
          // Debug: log wallet balance reads
          if (meta.kind === "walletHa" && val > 0n) {
            console.log(`[useMarketPositions] Market ${meta.marketId} walletHa balance: ${Number(val) / 1e18} (raw: ${val.toString()})`);
          }
        }
      });
    } else {
      if (isDebug) {
        console.log("[useMarketPositions] No data returned from contract reads");
      }
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
        const walletHaAmount = Number(pos.walletHa) / 1e18;
        pos.walletHaUSD = walletHaAmount * priceUSD;
        pos.collateralPoolUSD = (Number(pos.collateralPool) / 1e18) * priceUSD;
        pos.sailPoolUSD = (Number(pos.sailPool) / 1e18) * priceUSD;
        pos.totalUSD = pos.walletHaUSD + pos.collateralPoolUSD + pos.sailPoolUSD;
        
        if (pos.walletHa > 0n) {
          if (isDebug) {
            console.log(
              `[useMarketPositions] Market ${config.marketId}: walletHa=${walletHaAmount}, priceUSD=$${priceUSD}, walletHaUSD=$${pos.walletHaUSD}`
            );
          }
        }
      } else {
        // If price missing, keep USD as 0 to signal unavailable
        if (isDebug) {
          console.warn(
            `[useMarketPositions] Market ${config.marketId}: No price available, walletHa=${
              Number(pos.walletHa) / 1e18
            }`
          );
        }
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
