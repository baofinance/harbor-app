"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMemo } from "react";
import { minterABI } from "@/abis/minter";
import { STABILITY_POOL_MANAGER_ABI } from "@/abis/shared";

export interface HarvestData {
  harvestableAmount: bigint;
  harvestableAmountFormatted: string;
  bountyRatio: bigint;
  cutRatio: bigint;
  bountyAmount: bigint;
  bountyAmountFormatted: string;
  cutAmount: bigint;
  cutAmountFormatted: string;
  poolAmount: bigint;
  poolAmountFormatted: string;
  isLoading: boolean;
  error: Error | null;
}

export function useHarvest(
  minterAddress: `0x${string}` | undefined,
  stabilityPoolManagerAddress: `0x${string}` | undefined,
  wrappedCollateralDecimals: number = 18
): HarvestData {
  const { address } = useAccount();

  // Fetch harvestable amount from Minter
  const {
    data: harvestableAmount,
    isLoading: loadingHarvestable,
    error: harvestableError,
  } = useReadContract({
    address: minterAddress,
    abi: minterABI,
    functionName: "harvestable",
    query: {
      enabled: !!minterAddress,
    },
  });

  // Fetch bounty and cut ratios from StabilityPoolManager
  const {
    data: bountyRatio,
    isLoading: loadingBountyRatio,
    error: bountyRatioError,
  } = useReadContract({
    address: stabilityPoolManagerAddress,
    abi: STABILITY_POOL_MANAGER_ABI,
    functionName: "harvestBountyRatio",
    query: {
      enabled: !!stabilityPoolManagerAddress,
    },
  });

  const {
    data: cutRatio,
    isLoading: loadingCutRatio,
    error: cutRatioError,
  } = useReadContract({
    address: stabilityPoolManagerAddress,
    abi: STABILITY_POOL_MANAGER_ABI,
    functionName: "harvestCutRatio",
    query: {
      enabled: !!stabilityPoolManagerAddress,
    },
  });

  // Calculate derived values
  const calculated = useMemo(() => {
    if (!harvestableAmount || !bountyRatio || !cutRatio) {
      return null;
    }

    const harvestable = harvestableAmount;
    const bounty = (harvestable * bountyRatio) / BigInt(1e18);
    const cut = (harvestable * cutRatio) / BigInt(1e18);
    const pool = harvestable - bounty - cut;

    return {
      harvestableAmountFormatted: formatUnits(harvestable, wrappedCollateralDecimals),
      bountyAmount: bounty,
      bountyAmountFormatted: formatUnits(bounty, wrappedCollateralDecimals),
      cutAmount: cut,
      cutAmountFormatted: formatUnits(cut, wrappedCollateralDecimals),
      poolAmount: pool,
      poolAmountFormatted: formatUnits(pool, wrappedCollateralDecimals),
    };
  }, [harvestableAmount, bountyRatio, cutRatio, wrappedCollateralDecimals]);

  const error =
    harvestableError || bountyRatioError || cutRatioError
      ? (harvestableError || bountyRatioError || cutRatioError) as Error
      : null;

  return {
    harvestableAmount: harvestableAmount || BigInt(0),
    harvestableAmountFormatted: calculated?.harvestableAmountFormatted || "0",
    bountyRatio: bountyRatio || BigInt(0),
    cutRatio: cutRatio || BigInt(0),
    bountyAmount: calculated?.bountyAmount || BigInt(0),
    bountyAmountFormatted: calculated?.bountyAmountFormatted || "0",
    cutAmount: calculated?.cutAmount || BigInt(0),
    cutAmountFormatted: calculated?.cutAmountFormatted || "0",
    poolAmount: calculated?.poolAmount || BigInt(0),
    poolAmountFormatted: calculated?.poolAmountFormatted || "0",
    isLoading: loadingHarvestable || loadingBountyRatio || loadingCutRatio,
    error,
  };
}

