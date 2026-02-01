"use client";

import { useMemo } from "react";
import { useContractReads } from "./useContractReads";

import { MINTER_ABI, STABILITY_POOL_ABI } from "@/abis/shared";

export interface VolatilityProtectionData {
  /** The calculated volatility protection percentage string (e.g., "49.8%", ">100%", "0%") */
  protection: string;
  /** The protection as a number (0-100+, undefined if not calculable) */
  protectionPercent: number | undefined;
  /** Collateral ratio from minter (18 decimals) */
  collateralRatio: bigint | undefined;
  /** Total debt (pegged token balance) from minter (18 decimals) */
  totalDebt: bigint | undefined;
  /** Collateral pool TVL (18 decimals) */
  collateralPoolTVL: bigint | undefined;
  /** Sail pool TVL (18 decimals) */
  sailPoolTVL: bigint | undefined;
  /** Collateral token balance (18 decimals) */
  collateralTokenBalance: bigint | undefined;
  /** Whether data is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Calculate the adverse price movement needed to reach 100% collateral ratio (depeg point).
 *
 * This accounts for stability pools that can rebalance and improve the CR:
 * - Collateral Pool: Burns pegged tokens → receives collateral (reduces both debt AND collateral)
 * - Sail Pool: Burns pegged tokens → receives leveraged tokens (reduces ONLY debt, more effective)
 */
function calculateVolatilityProtection(
  collateralRatio: bigint | undefined,
  totalDebt: bigint | undefined,
  collateralPoolTVL: bigint | undefined,
  sailPoolTVL: bigint | undefined
): { protection: string; protectionPercent: number | undefined } {
  // Need both CR and debt to calculate
  if (!collateralRatio || !totalDebt || totalDebt === 0n) {
    return { protection: "-", protectionPercent: undefined };
  }

  // Calculate collateral value from CR and debt
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% CR)
  // collateralValue = CR * debt / 1e18
  const collateralValue = (collateralRatio * totalDebt) / 10n ** 18n;

  // Pool TVLs (in pegged tokens)
  const collateralPoolAbsorption = collateralPoolTVL || 0n;
  const sailPoolAbsorption = sailPoolTVL || 0n;

  // Total debt reduction from both pools
  const totalDebtReduction = collateralPoolAbsorption + sailPoolAbsorption;

  // Cap debt reduction at total debt
  const effectiveDebtReduction =
    totalDebtReduction > totalDebt ? totalDebt : totalDebtReduction;

  // Collateral reduction: ONLY from collateral pool (sail pool doesn't remove collateral)
  const effectiveCollateralReduction =
    collateralPoolAbsorption > collateralValue
      ? collateralValue
      : collateralPoolAbsorption;

  // Effective values after full rebalancing
  const effectiveDebt = totalDebt - effectiveDebtReduction;
  const effectiveCollateral = collateralValue - effectiveCollateralReduction;

  // If all debt can be absorbed by pools, infinite protection
  if (effectiveDebt === 0n) {
    return { protection: ">100%", protectionPercent: 100 };
  }

  // If no collateral left after pool drain, already at risk
  if (effectiveCollateral === 0n) {
    return { protection: "0%", protectionPercent: 0 };
  }

  // Calculate price drop needed to reach 100% CR
  // At 100% CR: effectiveCollateral * (1 - X) = effectiveDebt
  // X = 1 - (effectiveDebt / effectiveCollateral)
  const debtNum = Number(effectiveDebt);
  const collateralNum = Number(effectiveCollateral);

  if (debtNum >= collateralNum) {
    return { protection: "0%", protectionPercent: 0 }; // Already at or below 100% CR
  }

  const priceDropPercent = (1 - debtNum / collateralNum) * 100;

  if (priceDropPercent <= 0) {
    return { protection: "0%", protectionPercent: 0 };
  }
  if (priceDropPercent >= 100) {
    return { protection: ">100%", protectionPercent: 100 };
  }

  return {
    protection: `${priceDropPercent.toFixed(1)}%`,
    protectionPercent: priceDropPercent,
  };
}

/**
 * Hook to calculate volatility protection for a market.
 *
 * Volatility protection measures the percentage adverse price movement between
 * collateral and pegged token needed to reach the depeg point (100% collateral ratio).
 *
 * @param minterAddress - The minter contract address
 * @param collateralPoolAddress - The collateral stability pool address (optional)
 * @param sailPoolAddress - The sail/leveraged stability pool address (optional)
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * const { protection, isLoading } = useVolatilityProtection(
 *   "0x980d1d2c22fadc8fff8fb3e3261037a75cc7cd3f",
 *   "0xa95a6a19d6b693d71f41887e24f6d9652dab89ce",
 *   "0x76a1bb7fe2697b23d43f76f66867f35aceaf04c4"
 * );
 * // protection = "49.8%"
 * ```
 */
export function useVolatilityProtection(
  minterAddress: `0x${string}` | undefined,
  collateralPoolAddress: `0x${string}` | undefined,
  sailPoolAddress: `0x${string}` | undefined,
  options?: {
    /** Refetch interval in ms (default: 30000) */
    refetchInterval?: number;
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
  }
): VolatilityProtectionData {
  const { refetchInterval = 30000, enabled = true } = options ?? {};

  const contracts = useMemo(() => {
    if (!minterAddress) return [];

    const contractCalls: any[] = [
      // Minter reads
      {
        address: minterAddress,
        abi: MINTER_ABI,
        functionName: "collateralRatio" as const,
      },
      {
        address: minterAddress,
        abi: MINTER_ABI,
        functionName: "peggedTokenBalance" as const,
      },
      {
        address: minterAddress,
        abi: MINTER_ABI,
        functionName: "collateralTokenBalance" as const,
      },
    ];

    // Add collateral pool TVL read if address provided
    if (collateralPoolAddress) {
      contractCalls.push({
        address: collateralPoolAddress,
        abi: STABILITY_POOL_ABI,
        functionName: "totalAssetSupply" as const,
      });
    }

    // Add sail pool TVL read if address provided
    if (sailPoolAddress) {
      contractCalls.push({
        address: sailPoolAddress,
        abi: STABILITY_POOL_ABI,
        functionName: "totalAssetSupply" as const,
      });
    }

    return contractCalls;
  }, [minterAddress, collateralPoolAddress, sailPoolAddress]);

  const {
    data: reads,
    isLoading,
    error,
  } = useContractReads({
    contracts,
    enabled: enabled && !!minterAddress && contracts.length > 0,
    refetchInterval,
  });

  return useMemo(() => {
    const defaultResult: VolatilityProtectionData = {
      protection: "-",
      protectionPercent: undefined,
      collateralRatio: undefined,
      totalDebt: undefined,
      collateralPoolTVL: undefined,
      sailPoolTVL: undefined,
      collateralTokenBalance: undefined,
      isLoading,
      error: error as Error | null,
    };

    if (!reads || reads.length < 3) {
      return defaultResult;
    }

    // Extract values from reads
    const collateralRatio =
      reads[0]?.status === "success" ? (reads[0].result as bigint) : undefined;
    const totalDebt =
      reads[1]?.status === "success" ? (reads[1].result as bigint) : undefined;
    const collateralTokenBalance =
      reads[2]?.status === "success" ? (reads[2].result as bigint) : undefined;

    let readIndex = 3;
    let collateralPoolTVL: bigint | undefined;
    let sailPoolTVL: bigint | undefined;

    if (collateralPoolAddress && reads[readIndex]) {
      collateralPoolTVL =
        reads[readIndex]?.status === "success"
          ? (reads[readIndex].result as bigint)
          : undefined;
      readIndex++;
    }

    if (sailPoolAddress && reads[readIndex]) {
      sailPoolTVL =
        reads[readIndex]?.status === "success"
          ? (reads[readIndex].result as bigint)
          : undefined;
    }

    // Calculate protection
    const { protection, protectionPercent } = calculateVolatilityProtection(
      collateralRatio,
      totalDebt,
      collateralPoolTVL,
      sailPoolTVL
    );

    return {
      protection,
      protectionPercent,
      collateralRatio,
      totalDebt,
      collateralPoolTVL,
      sailPoolTVL,
      collateralTokenBalance,
      isLoading,
      error: error as Error | null,
    };
  }, [reads, isLoading, error, collateralPoolAddress, sailPoolAddress]);
}

/**
 * Hook to calculate volatility protection for multiple markets.
 */
export function useMultipleVolatilityProtection(
  markets: Array<{
    minterAddress: `0x${string}` | undefined;
    collateralPoolAddress: `0x${string}` | undefined;
    sailPoolAddress: `0x${string}` | undefined;
  }>,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
): {
  data: Map<string, VolatilityProtectionData>;
  isLoading: boolean;
  error: Error | null;
} {
  const { refetchInterval = 30000, enabled = true } = options ?? {};

  const contracts = useMemo(() => {
    return markets.flatMap((market) => {
      if (!market.minterAddress) return [];

      const contractCalls: any[] = [
        {
          address: market.minterAddress,
          abi: MINTER_ABI,
          functionName: "collateralRatio" as const,
        },
        {
          address: market.minterAddress,
          abi: MINTER_ABI,
          functionName: "peggedTokenBalance" as const,
        },
        {
          address: market.minterAddress,
          abi: MINTER_ABI,
          functionName: "collateralTokenBalance" as const,
        },
      ];

      if (market.collateralPoolAddress) {
        contractCalls.push({
          address: market.collateralPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply" as const,
        });
      }

      if (market.sailPoolAddress) {
        contractCalls.push({
          address: market.sailPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply" as const,
        });
      }

      return contractCalls;
    });
  }, [markets]);

  const {
    data: reads,
    isLoading,
    error,
  } = useContractReads({
    contracts,
    enabled: enabled && contracts.length > 0,
    refetchInterval,
  });

  const data = useMemo(() => {
    const map = new Map<string, VolatilityProtectionData>();

    let readIndex = 0;
    markets.forEach((market) => {
      if (!market.minterAddress) return;

      const defaultData: VolatilityProtectionData = {
        protection: "-",
        protectionPercent: undefined,
        collateralRatio: undefined,
        totalDebt: undefined,
        collateralPoolTVL: undefined,
        sailPoolTVL: undefined,
        collateralTokenBalance: undefined,
        isLoading,
        error: error as Error | null,
      };

      if (!reads) {
        map.set(market.minterAddress.toLowerCase(), defaultData);
        return;
      }

      const collateralRatio =
        reads[readIndex]?.status === "success"
          ? (reads[readIndex].result as bigint)
          : undefined;
      const totalDebt =
        reads[readIndex + 1]?.status === "success"
          ? (reads[readIndex + 1].result as bigint)
          : undefined;
      const collateralTokenBalance =
        reads[readIndex + 2]?.status === "success"
          ? (reads[readIndex + 2].result as bigint)
          : undefined;

      readIndex += 3;

      let collateralPoolTVL: bigint | undefined;
      let sailPoolTVL: bigint | undefined;

      if (market.collateralPoolAddress) {
        collateralPoolTVL =
          reads[readIndex]?.status === "success"
            ? (reads[readIndex].result as bigint)
            : undefined;
        readIndex++;
      }

      if (market.sailPoolAddress) {
        sailPoolTVL =
          reads[readIndex]?.status === "success"
            ? (reads[readIndex].result as bigint)
            : undefined;
        readIndex++;
      }

      const { protection, protectionPercent } = calculateVolatilityProtection(
        collateralRatio,
        totalDebt,
        collateralPoolTVL,
        sailPoolTVL
      );

      map.set(market.minterAddress.toLowerCase(), {
        protection,
        protectionPercent,
        collateralRatio,
        totalDebt,
        collateralPoolTVL,
        sailPoolTVL,
        collateralTokenBalance,
        isLoading,
        error: error as Error | null,
      });
    });

    return map;
  }, [markets, reads, isLoading, error]);

  return { data, isLoading, error: error as Error | null };
}
