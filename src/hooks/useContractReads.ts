import { useContractReads as useWagmiContractReads } from "wagmi";
import type { ContractFunctionParameters } from "viem";

/**
 * Custom hook to read multiple contracts using wagmi
 * Simplified version - always uses wagmi's standard hooks for mainnet
 */
export function useContractReads<
  TContracts extends readonly ContractFunctionParameters[]
>({
  contracts,
  enabled = true,
  refetchInterval,
}: {
  contracts: TContracts;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useWagmiContractReads({
    contracts: contracts as any,
    query: {
      enabled: enabled && contracts.length > 0,
      retry: 1,
      refetchInterval,
    },
  });
}

// Re-export for backward compatibility during migration
export { useContractReads as useAnvilContractReads };

