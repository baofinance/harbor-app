"use client";

import { useMemo } from "react";
import { useAnvilContractReads } from "./useAnvilContractReads";

/**
 * ABI for the IWrappedPriceOracle interface used by the Minter contract.
 * latestAnswer() returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
 * All values are in 18 decimal format.
 */
const WRAPPED_PRICE_ORACLE_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface CollateralPriceData {
  /** Min underlying price (18 decimals) */
  minPrice: bigint | undefined;
  /** Max underlying price (18 decimals) - typically used for display */
  maxPrice: bigint | undefined;
  /** Min wrapped rate (e.g., stETH per wstETH) (18 decimals) */
  minRate: bigint | undefined;
  /** Max wrapped rate (18 decimals) */
  maxRate: bigint | undefined;
  /** Mid price = (minPrice + maxPrice) / 2 (18 decimals) */
  midPrice: bigint | undefined;
  /** Mid rate = (minRate + maxRate) / 2 (18 decimals) */
  midRate: bigint | undefined;
  /** Price in USD (as number, 18 decimal precision converted) */
  priceUSD: number;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Hook to fetch collateral price from the IWrappedPriceOracle interface.
 * This is the standard price oracle interface used by Harbor's Minter contract.
 * 
 * @param priceOracleAddress - The address of the price oracle contract
 * @param options - Optional configuration
 * @returns CollateralPriceData with price information
 * 
 * @example
 * ```tsx
 * const { priceUSD, maxPrice, isLoading } = useCollateralPrice(
 *   "0x28304c7fff39d0b83fae7c1537cb0e095041a19a"
 * );
 * ```
 */
export function useCollateralPrice(
  priceOracleAddress: `0x${string}` | undefined,
  options?: {
    /** Refetch interval in ms (default: 30000) */
    refetchInterval?: number;
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
  }
): CollateralPriceData {
  const { refetchInterval = 30000, enabled = true } = options ?? {};

  const contracts = useMemo(() => {
    if (!priceOracleAddress) return [];
    return [
      {
        address: priceOracleAddress,
        abi: WRAPPED_PRICE_ORACLE_ABI,
        functionName: "latestAnswer" as const,
      },
    ];
  }, [priceOracleAddress]);

  const { data: reads, isLoading, error } = useAnvilContractReads({
    contracts,
    enabled: enabled && !!priceOracleAddress && contracts.length > 0,
    refetchInterval,
  });

  return useMemo(() => {
    const defaultResult: CollateralPriceData = {
      minPrice: undefined,
      maxPrice: undefined,
      minRate: undefined,
      maxRate: undefined,
      midPrice: undefined,
      midRate: undefined,
      priceUSD: 0,
      isLoading,
      error: error as Error | null,
    };

    if (!reads || reads.length === 0) {
      return defaultResult;
    }

    const read = reads[0];
    if (!read || read.status !== "success" || !read.result) {
      return defaultResult;
    }

    // Extract the tuple result
    // latestAnswer returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
    let minPrice: bigint | undefined;
    let maxPrice: bigint | undefined;
    let minRate: bigint | undefined;
    let maxRate: bigint | undefined;

    const result = read.result;

    if (Array.isArray(result) && result.length >= 4) {
      // Array format: [minPrice, maxPrice, minRate, maxRate]
      minPrice = result[0] as bigint;
      maxPrice = result[1] as bigint;
      minRate = result[2] as bigint;
      maxRate = result[3] as bigint;
    } else if (typeof result === "object" && result !== null) {
      // Object format with named properties
      const obj = result as {
        minUnderlyingPrice?: bigint;
        maxUnderlyingPrice?: bigint;
        minWrappedRate?: bigint;
        maxWrappedRate?: bigint;
      };
      minPrice = obj.minUnderlyingPrice;
      maxPrice = obj.maxUnderlyingPrice;
      minRate = obj.minWrappedRate;
      maxRate = obj.maxWrappedRate;
    }

    // Calculate mid values
    const midPrice = minPrice !== undefined && maxPrice !== undefined
      ? (minPrice + maxPrice) / 2n
      : undefined;
    const midRate = minRate !== undefined && maxRate !== undefined
      ? (minRate + maxRate) / 2n
      : undefined;

    // Calculate USD price (using maxPrice as the display price)
    // All prices are in 18 decimals
    const priceUSD = maxPrice !== undefined
      ? Number(maxPrice) / 1e18
      : 0;

    return {
      minPrice,
      maxPrice,
      minRate,
      maxRate,
      midPrice,
      midRate,
      priceUSD,
      isLoading,
      error: error as Error | null,
    };
  }, [reads, isLoading, error]);
}

/**
 * Hook to fetch collateral prices for multiple markets.
 * 
 * @param priceOracleAddresses - Array of price oracle addresses
 * @returns Map of oracle address to CollateralPriceData
 */
export function useMultipleCollateralPrices(
  priceOracleAddresses: (`0x${string}` | undefined)[],
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
): {
  prices: Map<string, CollateralPriceData>;
  isLoading: boolean;
  error: Error | null;
} {
  const { refetchInterval = 30000, enabled = true } = options ?? {};

  const validAddresses = useMemo(
    () => priceOracleAddresses.filter((addr): addr is `0x${string}` => !!addr),
    [priceOracleAddresses]
  );

  const contracts = useMemo(() => {
    return validAddresses.map((address) => ({
      address,
      abi: WRAPPED_PRICE_ORACLE_ABI,
      functionName: "latestAnswer" as const,
    }));
  }, [validAddresses]);

  const { data: reads, isLoading, error } = useAnvilContractReads({
    contracts,
    enabled: enabled && contracts.length > 0,
    refetchInterval,
  });

  const prices = useMemo(() => {
    const map = new Map<string, CollateralPriceData>();

    validAddresses.forEach((address, index) => {
      const read = reads?.[index];
      const defaultData: CollateralPriceData = {
        minPrice: undefined,
        maxPrice: undefined,
        minRate: undefined,
        maxRate: undefined,
        midPrice: undefined,
        midRate: undefined,
        priceUSD: 0,
        isLoading,
        error: error as Error | null,
      };

      if (!read || read.status !== "success" || !read.result) {
        map.set(address.toLowerCase(), defaultData);
        return;
      }

      const result = read.result;
      let minPrice: bigint | undefined;
      let maxPrice: bigint | undefined;
      let minRate: bigint | undefined;
      let maxRate: bigint | undefined;

      if (Array.isArray(result) && result.length >= 4) {
        minPrice = result[0] as bigint;
        maxPrice = result[1] as bigint;
        minRate = result[2] as bigint;
        maxRate = result[3] as bigint;
      } else if (typeof result === "object" && result !== null) {
        const obj = result as {
          minUnderlyingPrice?: bigint;
          maxUnderlyingPrice?: bigint;
          minWrappedRate?: bigint;
          maxWrappedRate?: bigint;
        };
        minPrice = obj.minUnderlyingPrice;
        maxPrice = obj.maxUnderlyingPrice;
        minRate = obj.minWrappedRate;
        maxRate = obj.maxWrappedRate;
      }

      const midPrice = minPrice !== undefined && maxPrice !== undefined
        ? (minPrice + maxPrice) / 2n
        : undefined;
      const midRate = minRate !== undefined && maxRate !== undefined
        ? (minRate + maxRate) / 2n
        : undefined;

      const priceUSD = maxPrice !== undefined ? Number(maxPrice) / 1e18 : 0;

      map.set(address.toLowerCase(), {
        minPrice,
        maxPrice,
        minRate,
        maxRate,
        midPrice,
        midRate,
        priceUSD,
        isLoading,
        error: error as Error | null,
      });
    });

    return map;
  }, [validAddresses, reads, isLoading, error]);

  return { prices, isLoading, error: error as Error | null };
}

