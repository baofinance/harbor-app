import { useQuery } from "@tanstack/react-query";
import { anvilPublicClient } from "@/config/anvil";
import { shouldUseAnvil } from "@/config/environment";
import { useContractRead } from "wagmi";
import type { Abi, Address } from "viem";

/**
 * Custom hook to read contracts
 * Uses Anvil-specific reads when in development mode, otherwise uses wagmi
 */
export function useAnvilContractRead<
  TAbi extends Abi,
  TFunctionName extends string
>({
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
  const useAnvil = shouldUseAnvil();

  // Use wagmi's useContractRead for production
  const wagmiResult = useContractRead({
    address,
    abi,
    functionName,
    args,
    query: {
      enabled: enabled && !useAnvil,
      retry: 1,
      refetchInterval,
    },
  });

  // Create a serializable query key (convert BigInt to string)
  const serializableArgs = args?.map((arg: any) =>
    typeof arg === "bigint" ? arg.toString() : arg
  );

  // Use Anvil-specific reads for local development
  const anvilResult = useQuery({
    queryKey: ["anvil-contract-read", address, functionName, serializableArgs],
    queryFn: async () => {
      try {
        // Use the client method instead of standalone function to avoid bundling issues
        return await anvilPublicClient.readContract({
          address,
          abi,
          functionName,
          args,
        });
      } catch (error) {
        // Return undefined on error to allow graceful handling
        console.error(
          `[useAnvilContractRead] Error reading ${functionName} from ${address}:`,
          error
        );
        throw error;
      }
    },
    enabled: enabled && useAnvil,
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
      status: anvilResult.status,
      refetch: anvilResult.refetch,
    };
  }

  return wagmiResult;
}
