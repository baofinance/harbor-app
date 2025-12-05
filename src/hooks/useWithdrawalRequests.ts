import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { shouldUseAnvil } from "@/config/environment";
import { anvilPublicClient } from "@/config/anvil";
import { formatEther } from "viem";

export interface WithdrawalRequest {
  poolAddress: `0x${string}`;
  amount: bigint;
  requestedAt: bigint;
  withdrawWindow: bigint;
  earlyWithdrawFee: bigint;
  canWithdraw: boolean;
  withdrawableAt: bigint;
}

export function useWithdrawalRequests(poolAddresses: `0x${string}`[]) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["withdrawal-requests", address, poolAddresses],
    queryFn: async () => {
      if (!address || !poolAddresses.length) return [];

      const client = shouldUseAnvil() ? anvilPublicClient : publicClient;
      if (!client) {
        console.debug("No client available for withdrawal requests");
        return [];
      }

      const requests: WithdrawalRequest[] = [];

      for (const poolAddress of poolAddresses) {
        try {
          // First check if the function exists by trying to read it
          // If it reverts or returns zero, there's no pending request
          let amount: bigint = 0n;
          let requestedAt: bigint = 0n;
          
          try {
            const result = (await client.readContract({
              address: poolAddress,
              abi: stabilityPoolABI,
              functionName: "withdrawRequest",
              args: [address],
            })) as [bigint, bigint] | bigint | undefined;

            // Handle different return types
            if (Array.isArray(result)) {
              [amount, requestedAt] = result;
            } else if (result !== undefined) {
              // If it's a single value, assume it's the amount
              amount = result as bigint;
            }
          } catch (readError: any) {
            // If the function reverts (e.g., no request exists), that's fine
            // Check if it's a revert error or a function not found error
            const errorMessage = readError?.message || "";
            const errorCode = readError?.code || "";
            
            if (
              errorMessage.includes("revert") ||
              errorMessage.includes("execution reverted") ||
              errorMessage.includes("ContractFunctionExecutionError") ||
              errorCode === "CALL_EXCEPTION" ||
              errorCode === "CONTRACT_FUNCTION_EXECUTION_ERROR"
            ) {
              // No withdrawal request exists, which is fine - skip this pool
              continue;
            }
            // For network errors, skip silently
            if (errorMessage.includes("Failed to fetch") || errorMessage.includes("network")) {
              continue;
            }
            // For other errors, log at debug level and skip
            console.debug(`Skipping withdrawal request check for ${poolAddress}:`, errorMessage);
            continue;
          }

          // If there's a pending request
          if (amount > 0n && requestedAt > 0n) {
            // Get withdrawal window and early withdraw fee
            let withdrawWindow: bigint = 0n;
            let earlyWithdrawFee: bigint = 0n;
            
            try {
              [withdrawWindow, earlyWithdrawFee] = await Promise.all([
                client.readContract({
                  address: poolAddress,
                  abi: stabilityPoolABI,
                  functionName: "withdrawWindow",
                  args: [],
                }) as Promise<bigint>,
                client.readContract({
                  address: poolAddress,
                  abi: stabilityPoolABI,
                  functionName: "earlyWithdrawFee",
                  args: [],
                }) as Promise<bigint>,
              ]);
            } catch (configError) {
              // If these functions don't exist, use defaults
              console.warn(`Could not read withdrawal config for ${poolAddress}, using defaults:`, configError);
              withdrawWindow = BigInt(7 * 24 * 60 * 60); // Default 7 days
              earlyWithdrawFee = BigInt(0); // Default no fee
            }

            // Get current block timestamp
            const block = await client.getBlock({ blockTag: "latest" });
            const currentTime = BigInt(block.timestamp);
            const withdrawableAt = requestedAt + withdrawWindow;
            const canWithdraw = currentTime >= withdrawableAt;

            requests.push({
              poolAddress,
              amount,
              requestedAt,
              withdrawWindow,
              earlyWithdrawFee,
              canWithdraw,
              withdrawableAt,
            });
          }
        } catch (error: any) {
          // If function doesn't exist or other error, skip this pool silently
          // This is expected if the contract doesn't support withdrawal requests
          const errorMessage = error?.message || "";
          
          // Don't throw network errors or contract errors - just skip
          if (
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("network") ||
            errorMessage.includes("revert") ||
            errorMessage.includes("execution reverted")
          ) {
            // Expected errors - skip silently
            continue;
          }
          
          // Log unexpected errors at debug level
          console.debug(`Skipping withdrawal request check for ${poolAddress}:`, errorMessage);
        }
      }

      return requests;
    },
    enabled: !!address && poolAddresses.length > 0 && !!publicClient,
    refetchInterval: (query) => {
      // Only refetch if we have valid data
      if (query.state.data && Array.isArray(query.state.data) && query.state.data.length > 0) {
        return 1000; // Refetch every second to update timers
      }
      return false; // Don't refetch if no requests
    },
    retry: false, // Don't retry on failure
    throwOnError: false, // Don't throw errors, just return empty array
  });
}

