import { useContractRead as useWagmiContractRead } from "wagmi";
import type { Abi, Address } from "viem";

/**
 * Custom hook to read contracts using wagmi
 * Simplified version - always uses wagmi's standard hooks for mainnet
 */
export function useContractRead<TAbi extends Abi, TFunctionName extends string>({
  address,
  abi,
  functionName,
  args,
  enabled = true,
  refetchInterval,
}: {
  address: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args?: readonly unknown[];
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useWagmiContractRead({
    address,
    abi,
    functionName,
    args,
    query: {
      enabled,
      retry: 1,
      refetchInterval,
    },
  });
}

// Re-export for backward compatibility during migration
export { useContractRead as useAnvilContractRead };

