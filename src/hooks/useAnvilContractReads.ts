import { useQuery } from "@tanstack/react-query";
import { anvilPublicClient } from "@/config/anvil";
import { shouldUseAnvil } from "@/config/environment";
import { useContractReads } from "wagmi";
import type { ContractFunctionParameters } from "viem";

/**
 * Custom hook to read multiple contracts
 * Uses Anvil-specific reads when in development mode, otherwise uses wagmi
 * Returns data in the same format as wagmi's useContractReads for compatibility
 */
export function useAnvilContractReads<
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
  const useAnvil = shouldUseAnvil();

  // Use wagmi's useContractReads for production
  const wagmiResult = useContractReads({
    contracts: contracts as any,
    query: {
      enabled: enabled && contracts.length > 0 && !useAnvil,
      retry: 1,
      refetchInterval,
    },
  });

  // Create a serializable query key (convert BigInt to string)
  const serializableContracts = contracts.map((c: any) => ({
    address: c.address,
    functionName: c.functionName,
    args: c.args?.map((arg: any) =>
      typeof arg === "bigint" ? arg.toString() : arg
    ),
  }));

  // Use Anvil-specific reads for local development
  const anvilResult = useQuery({
    queryKey: ["anvil-contract-reads", serializableContracts],
    queryFn: async () => {
      try {
        // Use Promise.all to read all contracts in parallel
        // Each readContract call handles its own errors
        const results = await Promise.all(
          contracts.map(async (contract: any) => {
            try {
              const result = await anvilPublicClient.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: contract.functionName,
                args: contract.args,
              });
              return {
                result,
                status: "success" as const,
              };
            } catch (error) {
              return {
                result: undefined,
                status: "failure" as const,
                error: error as Error,
              };
            }
          })
        );

        // Results are already in the correct format: [{ result, status }, ...]
        const transformed = results;

        return transformed;
      } catch (error) {
        console.error(
          `[useAnvilContractReads] Error reading contracts:`,
          error
        );
        // Return array of failed results matching wagmi format
        return contracts.map(() => ({
          result: undefined,
          status: "failure" as const,
          error: error as Error,
        }));
      }
    },
    enabled: enabled && contracts.length > 0 && useAnvil,
    refetchInterval,
    retry: 1,
    throwOnError: false, // Don't throw, return error in query result
  });

  // Return the appropriate result based on environment
  if (useAnvil) {
    return {
      data: anvilResult.data,
      isLoading: anvilResult.isLoading,
      isError: anvilResult.isError,
      error: anvilResult.error,
      refetch: anvilResult.refetch,
    };
  }

  return wagmiResult;
}
