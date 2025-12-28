"use client";

import { useMemo } from "react";
import { useContractReads } from "wagmi";
import { formatEther } from "viem";
import { markets } from "@/config/markets";
import { GENESIS_ABI } from "@/config/contracts";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";

const erc20BalanceABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Hook to calculate total TVL across all genesis deposits (not stability pools)
 * Sums up all active deposits in all genesis markets
 */
export function useTotalGenesisTVL() {
  // Get all genesis markets (exclude coming soon markets and zero addresses)
  const genesisMarkets = useMemo(
    () =>
      Object.entries(markets).filter(
        ([_, mkt]) => {
          const genesisAddr = (mkt as any).addresses?.genesis;
          return genesisAddr && 
                 genesisAddr !== "0x0000000000000000000000000000000000000000" &&
                 (mkt as any).status !== "coming-soon";
        }
      ),
    []
  );

  // Get wrapped collateral token addresses for each genesis market
  const collateralTokenContracts = useMemo(() => {
    return genesisMarkets.map(([_, mkt]) => {
      const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
      if (
        !g ||
        typeof g !== "string" ||
        !g.startsWith("0x") ||
        g.length !== 42
      ) {
        return null;
      }
      return {
        address: g,
        abi: GENESIS_ABI,
        functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
      };
    });
  }, [genesisMarkets]);

  const { data: collateralTokenReads } = useContractReads({
    contracts: collateralTokenContracts.filter(
      (c): c is NonNullable<typeof c> => c !== null
    ),
    enabled: genesisMarkets.length > 0,
  });

  // Get total deposits contracts (balanceOf wrapped collateral in genesis contracts)
  const totalDepositsContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt], mi) => {
      const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
      const wrappedCollateralAddress = collateralTokenReads?.[mi]?.result as
        | `0x${string}`
        | undefined;
      if (
        !g ||
        !wrappedCollateralAddress ||
        typeof g !== "string" ||
        !g.startsWith("0x") ||
        g.length !== 42 ||
        typeof wrappedCollateralAddress !== "string" ||
        !wrappedCollateralAddress.startsWith("0x") ||
        wrappedCollateralAddress.length !== 42
      ) {
        return [];
      }
      return [
        {
          address: wrappedCollateralAddress,
          abi: erc20BalanceABI,
          functionName: "balanceOf" as const,
          args: [g],
        },
      ];
    });
  }, [genesisMarkets, collateralTokenReads]);

  const { data: totalDepositsReads } = useContractReads({
    contracts: totalDepositsContracts,
    enabled:
      genesisMarkets.length > 0 &&
      collateralTokenReads &&
      collateralTokenReads.length > 0,
  });

  // Get price oracle addresses for collateral prices
  const collateralOracleAddresses = useMemo(() => {
    return genesisMarkets
      .map(([_, mkt]) => {
        const oracleAddress = (mkt as any).addresses?.collateralPrice as `0x${string}` | undefined;
        return oracleAddress;
      })
      .filter((addr): addr is `0x${string}` => 
        !!addr && typeof addr === "string" && addr.startsWith("0x") && addr.length === 42
      );
  }, [genesisMarkets]);

  const { prices: collateralPricesMap, isLoading: isLoadingPrices } = useMultipleCollateralPrices(
    collateralOracleAddresses.length > 0 ? collateralOracleAddresses : [],
    { 
      refetchInterval: 120000,
      enabled: collateralOracleAddresses.length > 0
    }
  );

  // Calculate total TVL
  const totalTVL = useMemo(() => {
    if (!totalDepositsReads || !collateralPricesMap) return 0;
    
    // Ensure collateralPricesMap is a Map
    if (!(collateralPricesMap instanceof Map)) {
      console.warn("[useTotalGenesisTVL] collateralPricesMap is not a Map:", typeof collateralPricesMap);
      return 0;
    }

    let sum = 0;

    genesisMarkets.forEach(([id, mkt], mi) => {
      try {
        const totalDeposits = totalDepositsReads[mi]?.result as
          | bigint
          | undefined;

        if (!totalDeposits) return;

        // Get collateral price for this market from the price map
        const oracleAddress = (mkt as any).addresses?.collateralPrice as `0x${string}` | undefined;
        if (!oracleAddress || typeof oracleAddress !== "string") return;

        const priceData = collateralPricesMap.get(oracleAddress.toLowerCase());
        const collateralPriceUSD = priceData?.priceUSD || 0;

        if (collateralPriceUSD > 0) {
          const totalDepositsAmount = Number(formatEther(totalDeposits));
          const totalDepositsUSD = totalDepositsAmount * collateralPriceUSD;
          sum += totalDepositsUSD;
        }
      } catch (error) {
        console.error(`[useTotalGenesisTVL] Error calculating TVL for market ${id}:`, error);
        // Continue with other markets
      }
    });

    return sum;
  }, [totalDepositsReads, collateralPricesMap, genesisMarkets]);

  const isLoading =
    !totalDepositsReads ||
    isLoadingPrices ||
    !collateralPricesMap ||
    !(collateralPricesMap instanceof Map) ||
    genesisMarkets.length === 0;

  return {
    totalTVL,
    isLoading,
  };
}

