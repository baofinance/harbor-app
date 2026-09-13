"use client";

import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { MINTER_PEGGED_ABI } from "@/abis";
import type { AnchorModalMarketEntry } from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseStabilityPoolCollateralRatioParams = {
  simpleMode: boolean;
  isActive: boolean;
  activeTab: AnchorDepositWithdrawTab;
  selectedStabilityPool: {
    marketId: string;
    poolType: "none" | "collateral" | "sail";
  } | null;
  marketsForToken: readonly AnchorModalMarketEntry[];
};

/**
 * Collateral-ratio display data for the market behind the pool the user picked in
 * simple mode (separate from the deposit market, which may differ).
 */
export function useStabilityPoolCollateralRatio({
  simpleMode,
  isActive,
  activeTab,
  selectedStabilityPool,
  marketsForToken,
}: UseStabilityPoolCollateralRatioParams) {
  // Get minter address for the selected stability pool's market (for collateral ratio display)
  const stabilityPoolMarket = useMemo(() => {
    if (!selectedStabilityPool || !simpleMode) return null;
    return marketsForToken.find(
      (m) => m.marketId === selectedStabilityPool.marketId
    )?.market;
  }, [selectedStabilityPool, marketsForToken, simpleMode]);

  const stabilityPoolMinterAddress = stabilityPoolMarket?.addresses?.minter;
  const isValidStabilityPoolMinter =
    stabilityPoolMinterAddress &&
    typeof stabilityPoolMinterAddress === "string" &&
    stabilityPoolMinterAddress.startsWith("0x") &&
    stabilityPoolMinterAddress.length === 42;

  // Fetch collateral ratio for the stability pool's market (only when pool is selected)
  const { data: collateralRatioData } = useContractRead({
    address: stabilityPoolMinterAddress as `0x${string}`,
    abi: MINTER_PEGGED_ABI,
    functionName: "collateralRatio",
    query: {
      enabled:
        !!isValidStabilityPoolMinter &&
        isActive &&
        simpleMode &&
        activeTab === "deposit" &&
        !!selectedStabilityPool,
      retry: 1,
      allowFailure: true,
    },
  });

  // Fetch config to get minimum collateral ratio for the stability pool's market
  const { data: minterConfigData } = useContractRead({
    address: stabilityPoolMinterAddress as `0x${string}`,
    abi: MINTER_PEGGED_ABI,
    functionName: "config",
    query: {
      enabled:
        !!isValidStabilityPoolMinter &&
        isActive &&
        simpleMode &&
        activeTab === "deposit" &&
        !!selectedStabilityPool,
      retry: 1,
      allowFailure: true,
    },
  });

  // Extract minimum collateral ratio from config (typically in the first band upper bound)
  const minCollateralRatio = useMemo(() => {
    if (!minterConfigData) return undefined;
    const config = minterConfigData as {
      mintPeggedIncentiveConfig?: {
        collateralRatioBandUpperBounds?: readonly bigint[];
      };
    };
    // Minimum collateral ratio is typically the first band upper bound
    const bands =
      config?.mintPeggedIncentiveConfig?.collateralRatioBandUpperBounds;
    if (bands && Array.isArray(bands) && bands.length > 0) {
      return bands[0] as bigint;
    }
    return undefined;
  }, [minterConfigData]);

  // Format collateral ratio as percentage
  const formatCollateralRatio = (ratio: bigint | undefined): string => {
    if (!ratio) return "-";
    // Collateral ratio is typically stored as a value where 1e18 = 100%
    return `${(Number(ratio) / 1e16).toFixed(2)}%`;
  };

  return {
    stabilityPoolMarket,
    stabilityPoolMinterAddress,
    isValidStabilityPoolMinter,
    collateralRatioData,
    minterConfigData,
    minCollateralRatio,
    formatCollateralRatio,
  };
}
