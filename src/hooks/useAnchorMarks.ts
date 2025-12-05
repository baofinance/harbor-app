"use client";

import { useAccount } from "wagmi";
import { useAnvilContractReads } from "./useAnvilContractReads";
import { markets } from "@/config/markets";
import { useMemo } from "react";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const STABILITY_POOL_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface AnchorMarksData {
  // ha token holdings
  haTokenBalance: bigint;
  haTokenBalanceUSD: number;
  haTokenMarksPerDay: number;

  // Collateral stability pool deposits
  collateralPoolBalance: bigint;
  collateralPoolBalanceUSD: number;
  collateralPoolMarksPerDay: number;

  // Sail (leveraged) stability pool deposits
  sailPoolBalance: bigint;
  sailPoolBalanceUSD: number;
  sailPoolMarksPerDay: number;

  // Totals
  totalMarksPerDay: number;
  totalBalanceUSD: number;
}

/**
 * Hook to calculate marks from ha tokens and stability pool deposits
 * Rate: 1 mark per dollar per day
 */
export function useAnchorMarks() {
  const { address, isConnected } = useAccount();

  // Get all market addresses
  const marketConfigs = useMemo(() => {
    return Object.entries(markets).map(([id, market]) => ({
      id,
      peggedToken: (market as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined,
      stabilityPoolCollateral: (market as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined,
      stabilityPoolLeveraged: (market as any).addresses
        ?.stabilityPoolLeveraged as `0x${string}` | undefined,
      priceOracle: (market as any).addresses?.priceOracle as
        | `0x${string}`
        | undefined,
    }));
  }, []);

  // Build contract read requests
  const contracts = useMemo(() => {
    if (!address || !isConnected) return [];

    const reads: any[] = [];

    marketConfigs.forEach((config) => {
      // Read ha token balance
      if (config.peggedToken) {
        reads.push({
          address: config.peggedToken,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });
      }

      // Read collateral stability pool balance
      if (config.stabilityPoolCollateral) {
        reads.push({
          address: config.stabilityPoolCollateral,
          abi: STABILITY_POOL_ABI,
          functionName: "balanceOf",
          args: [address],
        });
      }

      // Read sail stability pool balance
      if (config.stabilityPoolLeveraged) {
        reads.push({
          address: config.stabilityPoolLeveraged,
          abi: STABILITY_POOL_ABI,
          functionName: "balanceOf",
          args: [address],
        });
      }

      // Read price oracle
      if (config.priceOracle) {
        reads.push({
          address: config.priceOracle,
          abi: CHAINLINK_ABI,
          functionName: "latestAnswer",
        });
        reads.push({
          address: config.priceOracle,
          abi: CHAINLINK_ABI,
          functionName: "decimals",
        });
      }
    });

    return reads;
  }, [address, isConnected, marketConfigs]);

  const {
    data: reads,
    isLoading,
    error,
    refetch,
  } = useAnvilContractReads({
    contracts,
    enabled: contracts.length > 0 && isConnected && !!address,
    refetchInterval: 30000,
  });

  // Process the data
  const marksData = useMemo((): AnchorMarksData => {
    const defaultData: AnchorMarksData = {
      haTokenBalance: 0n,
      haTokenBalanceUSD: 0,
      haTokenMarksPerDay: 0,
      collateralPoolBalance: 0n,
      collateralPoolBalanceUSD: 0,
      collateralPoolMarksPerDay: 0,
      sailPoolBalance: 0n,
      sailPoolBalanceUSD: 0,
      sailPoolMarksPerDay: 0,
      totalMarksPerDay: 0,
      totalBalanceUSD: 0,
    };

    if (!reads || reads.length === 0) return defaultData;

    let haTokenBalance = 0n;
    let collateralPoolBalance = 0n;
    let sailPoolBalance = 0n;
    let priceUSD = 0;

    let readIndex = 0;

    marketConfigs.forEach((config) => {
      // ha token balance
      if (config.peggedToken && reads[readIndex]) {
        const result = reads[readIndex];
        if (result?.status === "success" && result.result) {
          haTokenBalance += result.result as bigint;
        }
        readIndex++;
      }

      // Collateral pool balance
      if (config.stabilityPoolCollateral && reads[readIndex]) {
        const result = reads[readIndex];
        if (result?.status === "success" && result.result) {
          collateralPoolBalance += result.result as bigint;
        }
        readIndex++;
      }

      // Sail pool balance
      if (config.stabilityPoolLeveraged && reads[readIndex]) {
        const result = reads[readIndex];
        if (result?.status === "success" && result.result) {
          sailPoolBalance += result.result as bigint;
        }
        readIndex++;
      }

      // Price oracle
      if (config.priceOracle) {
        const priceResult = reads[readIndex];
        const decimalsResult = reads[readIndex + 1];

        if (
          priceResult?.status === "success" &&
          decimalsResult?.status === "success"
        ) {
          const rawPrice = priceResult.result as bigint;
          const decimals = decimalsResult.result as number;
          // For ha tokens, assume $1 peg for simplicity
          // The collateral price is for wstETH, but ha tokens are pegged
          priceUSD = 1; // ha tokens are pegged to $1
        }
        readIndex += 2;
      }
    });

    // Convert balances to numbers (18 decimals)
    const haTokenBalanceNum = Number(haTokenBalance) / 1e18;
    const collateralPoolBalanceNum = Number(collateralPoolBalance) / 1e18;
    const sailPoolBalanceNum = Number(sailPoolBalance) / 1e18;

    // Assume $1 per ha token (pegged)
    // For stability pools, the balance is in ha tokens
    const haTokenBalanceUSD = haTokenBalanceNum * 1; // $1 per ha token
    const collateralPoolBalanceUSD = collateralPoolBalanceNum * 1; // $1 per ha token in pool
    const sailPoolBalanceUSD = sailPoolBalanceNum * 1; // $1 per ha token in pool

    // Calculate marks per day (1 mark per dollar per day)
    const MARKS_PER_DOLLAR_PER_DAY = 1;
    const haTokenMarksPerDay = haTokenBalanceUSD * MARKS_PER_DOLLAR_PER_DAY;
    const collateralPoolMarksPerDay =
      collateralPoolBalanceUSD * MARKS_PER_DOLLAR_PER_DAY;
    const sailPoolMarksPerDay = sailPoolBalanceUSD * MARKS_PER_DOLLAR_PER_DAY;

    const totalMarksPerDay =
      haTokenMarksPerDay + collateralPoolMarksPerDay + sailPoolMarksPerDay;
    const totalBalanceUSD =
      haTokenBalanceUSD + collateralPoolBalanceUSD + sailPoolBalanceUSD;

    return {
      haTokenBalance,
      haTokenBalanceUSD,
      haTokenMarksPerDay,
      collateralPoolBalance,
      collateralPoolBalanceUSD,
      collateralPoolMarksPerDay,
      sailPoolBalance,
      sailPoolBalanceUSD,
      sailPoolMarksPerDay,
      totalMarksPerDay,
      totalBalanceUSD,
    };
  }, [reads, marketConfigs]);

  return {
    data: marksData,
    isLoading,
    error,
    refetch,
  };
}

