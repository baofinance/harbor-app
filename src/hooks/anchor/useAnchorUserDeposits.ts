import { useMemo } from "react";
import { useAccount, useContractReads } from "wagmi";
import { ERC20_ABI } from "@/abis/shared";
import { POLLING_INTERVALS } from "@/config/polling";

/**
 * Hook to fetch user's pegged token balances for all anchor markets
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param useAnvil - Whether to use anvil mode (for testing)
 * @returns User deposit map (marketIndex -> balance) and refetch function
 */
export function useAnchorUserDeposits(
  anchorMarkets: Array<[string, any]>,
  useAnvil: boolean = false
) {
  const { address } = useAccount();

  // Create contracts for user deposit reads
  const userDepositContracts = useMemo(() => {
    return anchorMarkets
      .map(([_, m], index) => {
        const peggedTokenAddress = (m as any).addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        if (
          !peggedTokenAddress ||
          typeof peggedTokenAddress !== "string" ||
          !peggedTokenAddress.startsWith("0x") ||
          peggedTokenAddress.length !== 42 ||
          !address
        )
          return null;
        return {
          marketIndex: index,
          contract: {
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [anchorMarkets, address]);

  const userDepositContractArray = useMemo(() => {
    return userDepositContracts.map((c) => c.contract);
  }, [userDepositContracts]);

  const wagmiUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: anchorMarkets.length > 0 && !!address && !useAnvil,
      retry: 1,
      retryOnMount: false,
      staleTime: 30_000, // 30 seconds - consider data fresh for 30s to prevent unnecessary refetches
      gcTime: 300_000, // 5 minutes - keep in cache for 5 minutes
      structuralSharing: true, // Only update if values actually changed
    },
  });

  const anvilUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: anchorMarkets.length > 0 && !!address && useAnvil,
      refetchInterval: POLLING_INTERVALS.FAST,
      staleTime: 10_000, // 10 seconds for anvil (shorter since we're polling)
      gcTime: 300_000, // 5 minutes - keep in cache
      structuralSharing: true, // Only update if values actually changed
    } as any,
  });

  const userDepositReads = useAnvil
    ? anvilUserDepositReads.data
    : wagmiUserDepositReads.data;
  const refetchUserDeposits = useAnvil
    ? anvilUserDepositReads.refetch
    : wagmiUserDepositReads.refetch;

  // Create a map for quick lookup: marketIndex -> deposit balance
  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      map.set(
        marketIndex,
        userDepositReads?.[contractIndex]?.result as bigint | undefined
      );
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  return {
    userDepositMap,
    refetchUserDeposits,
    isLoading: !userDepositReads && userDepositContractArray.length > 0,
  };
}

