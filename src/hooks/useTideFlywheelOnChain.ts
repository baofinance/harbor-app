"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { ERC20_ABI } from "@/abis/shared";
import { UNISWAP_V2_PAIR_ABI } from "@/abis/uniswapV2Pair";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import {
  polTideOwnershipPct,
  supplyBurnedPct,
  tideReserveFromPair,
  treasuryOwnershipPct,
} from "@/utils/tidePolOwnership";

export type TideFlywheelOnChainMetrics = {
  treasuryOwnershipPct: number | null;
  polOwnershipPct: number | null;
  supplyBurnedPct: number | null;
  totalSupply: bigint | null;
  tideTokenConfigured: boolean;
  polLpConfigured: boolean;
  burnConfigured: boolean;
  isLoading: boolean;
  isError: boolean;
};

export function useTideFlywheelOnChain(): TideFlywheelOnChainMetrics {
  const tideToken = TIDE_FLYWHEEL_CONFIG.tideTokenAddress;
  const polLp = TIDE_FLYWHEEL_CONFIG.polLpAddress;
  const treasury = TIDE_FLYWHEEL_CONFIG.treasuryAddress;
  const burnAddress = TIDE_FLYWHEEL_CONFIG.burnAddress;
  const chainId = TIDE_FLYWHEEL_CONFIG.chainId;

  const tideTokenConfigured = tideToken != null;
  const polLpConfigured = polLp != null && tideTokenConfigured;
  const burnConfigured = burnAddress != null && tideTokenConfigured;

  const contracts = useMemo(() => {
    if (!tideTokenConfigured || !tideToken) return [];

    const reads: Array<{
      address: `0x${string}`;
      abi: typeof ERC20_ABI | typeof UNISWAP_V2_PAIR_ABI;
      functionName: string;
      args?: readonly unknown[];
      chainId: number;
    }> = [
      {
        address: tideToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [treasury],
        chainId,
      },
      {
        address: tideToken,
        abi: ERC20_ABI,
        functionName: "totalSupply",
        chainId,
      },
    ];

    if (burnConfigured && burnAddress) {
      reads.push({
        address: tideToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [burnAddress],
        chainId,
      });
    }

    if (polLpConfigured && polLp) {
      reads.push(
        {
          address: polLp,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: "balanceOf",
          args: [treasury],
          chainId,
        },
        {
          address: polLp,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: "totalSupply",
          chainId,
        },
        {
          address: polLp,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: "getReserves",
          chainId,
        },
        {
          address: polLp,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: "token0",
          chainId,
        },
        {
          address: polLp,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: "token1",
          chainId,
        },
      );
    }

    return reads;
  }, [
    burnAddress,
    burnConfigured,
    polLp,
    polLpConfigured,
    tideToken,
    tideTokenConfigured,
    treasury,
    chainId,
  ]);

  const { data, isLoading, isError } = useReadContracts({
    contracts,
    query: { enabled: tideTokenConfigured },
  });

  return useMemo(() => {
    const empty = {
      treasuryOwnershipPct: null as number | null,
      polOwnershipPct: null as number | null,
      supplyBurnedPct: null as number | null,
      totalSupply: null as bigint | null,
      tideTokenConfigured: false,
      polLpConfigured: false,
      burnConfigured: false,
      isLoading: false,
      isError: false,
    };

    if (!tideTokenConfigured) return empty;

    if (isLoading || !data) {
      return {
        ...empty,
        tideTokenConfigured: true,
        polLpConfigured,
        burnConfigured,
        isLoading: true,
        isError,
      };
    }

    const treasuryBalance = data[0]?.result as bigint | undefined;
    const totalSupply = data[1]?.result as bigint | undefined;

    let readIndex = 2;
    let burnedBalance: bigint | undefined;
    if (burnConfigured) {
      burnedBalance = data[readIndex]?.result as bigint | undefined;
      readIndex += 1;
    }

    const treasuryPct =
      treasuryBalance != null && totalSupply != null
        ? treasuryOwnershipPct(treasuryBalance, totalSupply)
        : null;

    let burnedPct: number | null = null;
    if (burnedBalance != null && totalSupply != null) {
      burnedPct = supplyBurnedPct(burnedBalance, totalSupply);
    }

    let polPct: number | null = null;
    if (polLpConfigured && tideToken) {
      const treasuryLp = data[readIndex]?.result as bigint | undefined;
      const lpTotalSupply = data[readIndex + 1]?.result as bigint | undefined;
      const reserves = data[readIndex + 2]?.result as
        | readonly [bigint, bigint, number]
        | undefined;
      const token0 = data[readIndex + 3]?.result as `0x${string}` | undefined;
      const token1 = data[readIndex + 4]?.result as `0x${string}` | undefined;

      if (
        treasuryLp != null &&
        lpTotalSupply != null &&
        reserves != null &&
        token0 != null &&
        token1 != null &&
        totalSupply != null
      ) {
        const tideReserve = tideReserveFromPair(
          token0,
          token1,
          tideToken,
          reserves[0],
          reserves[1],
        );
        if (tideReserve != null) {
          polPct = polTideOwnershipPct({
            treasuryLpBalance: treasuryLp,
            lpTotalSupply,
            tideReserveInPool: tideReserve,
            totalTideSupply: totalSupply,
          });
        }
      }
    }

    return {
      treasuryOwnershipPct: treasuryPct,
      polOwnershipPct: polPct,
      supplyBurnedPct: burnedPct,
      totalSupply: totalSupply ?? null,
      tideTokenConfigured: true,
      polLpConfigured,
      burnConfigured,
      isLoading: false,
      isError,
    };
  }, [
    burnConfigured,
    data,
    isError,
    isLoading,
    polLpConfigured,
    tideToken,
    tideTokenConfigured,
  ]);
}
