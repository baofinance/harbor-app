"use client";

import { useAccount } from "wagmi";
import { useContractReads } from "./useContractReads";
import { markets } from "@/config/markets";
import { useMemo } from "react";
import {
  ERC20_ABI,
  STABILITY_POOL_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";

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
          abi: WRAPPED_PRICE_ORACLE_ABI,
          functionName: "decimals",
        });
        reads.push({
          address: config.priceOracle,
          abi: WRAPPED_PRICE_ORACLE_ABI,
          functionName: "latestAnswer",
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
  } = useContractReads({
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

    // Track which pegged tokens we've already seen to avoid double counting
    // (e.g., both EUR markets use the same haEUR token)
    const seenPeggedTokens = new Set<string>();

    let readIndex = 0;

    marketConfigs.forEach((config) => {
      // ha token balance - only count each unique token once
      if (config.peggedToken && reads[readIndex]) {
        const tokenAddress = config.peggedToken.toLowerCase();
        if (!seenPeggedTokens.has(tokenAddress)) {
          seenPeggedTokens.add(tokenAddress);
          const result = reads[readIndex];
          if (result?.status === "success" && result.result) {
            haTokenBalance += result.result as bigint;
          }
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
        const decimalsResult = reads[readIndex];
        const priceResult = reads[readIndex + 1];

        if (
          priceResult?.status === "success" &&
          decimalsResult?.status === "success"
        ) {
          // latestAnswer returns a tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
          // Use maxUnderlyingPrice (index 1) as the price
          const latestAnswerResult = priceResult.result as
            | [bigint, bigint, bigint, bigint]
            | undefined;
          const rawPrice = Array.isArray(latestAnswerResult)
            ? latestAnswerResult[1] // maxUnderlyingPrice is at index 1
            : undefined;
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

