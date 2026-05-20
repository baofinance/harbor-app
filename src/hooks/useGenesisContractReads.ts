"use client";

import { useMemo } from "react";
import { useContractReads } from "wagmi";
import { GENESIS_ABI, ERC20_ABI } from "@/abis/shared";
import type { GenesisMarketConfig } from "@/types/genesisMarket";

type GenesisMarketEntry = [string, GenesisMarketConfig];

export function useGenesisContractReads(
  genesisMarkets: GenesisMarketEntry[],
  isConnected: boolean,
  address?: `0x${string}`
) {
  const genesisReadContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt]) => {
      const g = mkt.addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = mkt?.chainId ?? 1;
      if (!g || typeof g !== "string" || !g.startsWith("0x") || g.length !== 42)
        return [];
      const base = [
        {
          address: g,
          abi: GENESIS_ABI,
          functionName: "genesisIsEnded" as const,
          chainId: mktChainId,
        },
      ];
      const user =
        isConnected && address
          ? [
              {
                address: g,
                abi: GENESIS_ABI,
                functionName: "balanceOf" as const,
                args: [address as `0x${string}`],
                chainId: mktChainId,
              },
              {
                address: g,
                abi: GENESIS_ABI,
                functionName: "claimable" as const,
                args: [address as `0x${string}`],
                chainId: mktChainId,
              },
            ]
          : [];
      return [...base, ...user];
    });
  }, [genesisMarkets, isConnected, address]);

  const { data: reads, refetch: refetchReads } = useContractReads({
    contracts: genesisReadContracts,
    query: {
      enabled: genesisMarkets.length > 0,
      refetchInterval: 60000,
    },
  });

  const collateralTokenContracts = useMemo(() => {
    return genesisMarkets
      .map(([_, mkt]) => {
        const g = mkt.addresses?.genesis as `0x${string}` | undefined;
        const mktChainId = mkt?.chainId ?? 1;
        if (!g || typeof g !== "string" || !g.startsWith("0x") || g.length !== 42)
          return null;
        return {
          address: g,
          abi: GENESIS_ABI,
          functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
          chainId: mktChainId,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [genesisMarkets]);

  const { data: collateralTokenReads, refetch: refetchCollateralTokens } =
    useContractReads({
      contracts: collateralTokenContracts,
      query: { enabled: genesisMarkets.length > 0 },
    });

  const totalDepositsContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt], mi) => {
      const g = mkt.addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = mkt?.chainId ?? 1;
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
      )
        return [];
      return [
        {
          address: wrappedCollateralAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [g],
          chainId: mktChainId,
        },
      ];
    });
  }, [genesisMarkets, collateralTokenReads]);

  const { data: totalDepositsReads, refetch: refetchTotalDeposits } =
    useContractReads({
      contracts: totalDepositsContracts,
      query: {
        enabled:
          genesisMarkets.length > 0 &&
          !!collateralTokenReads &&
          collateralTokenReads.length > 0,
      },
    });

  return {
    reads,
    refetchReads,
    collateralTokenReads,
    refetchCollateralTokens,
    totalDepositsReads,
    refetchTotalDeposits,
  } as const;
}
