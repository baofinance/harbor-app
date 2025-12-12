import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { STABILITY_POOL_ABI } from "@/abis/shared";
import { shouldUseAnvil } from "@/config/environment";
import { anvilPublicClient } from "@/config/anvil";

export type WithdrawalStatus = "waiting" | "window" | "expired";

export interface WithdrawalRequest {
  poolAddress: `0x${string}`;
  start: bigint;
  end: bigint;
  earlyWithdrawFee: bigint;
  status: WithdrawalStatus;
  canWithdraw: boolean;
  currentTime: bigint;
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
          // Read the withdrawal window for this user
          const [start, end] = (await client.readContract({
            address: poolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "getWithdrawalRequest",
            args: [address],
          })) as [bigint, bigint];

          // If no request, skip
          if (!start || !end || (start === 0n && end === 0n)) {
            continue;
          }

          // Early withdrawal fee (best-effort)
          let earlyWithdrawFee: bigint = 0n;
          try {
            earlyWithdrawFee = (await client.readContract({
              address: poolAddress,
              abi: STABILITY_POOL_ABI,
              functionName: "getEarlyWithdrawalFee",
              args: [],
            })) as bigint;
          } catch {
            earlyWithdrawFee = 0n;
          }

          // Determine status
          const block = await client.getBlock({ blockTag: "latest" });
          const now = BigInt(block.timestamp);
          let status: WithdrawalStatus = "waiting";
          if (now >= start && now <= end) status = "window";
          else if (now > end) status = "expired";

          const canWithdraw = status === "window";

          requests.push({
            poolAddress,
            start,
            end,
            earlyWithdrawFee,
            status,
            canWithdraw,
            currentTime: now,
          });
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
          console.debug(
            `Skipping withdrawal request check for ${poolAddress}:`,
            errorMessage
          );
        }
      }

      return requests;
    },
    enabled: !!address && poolAddresses.length > 0 && !!publicClient,
    refetchInterval: (query) => {
      // Only refetch if we have valid data
      if (
        query.state.data &&
        Array.isArray(query.state.data) &&
        query.state.data.length > 0
      ) {
        return 1000; // Refetch every second to update timers
      }
      return false; // Don't refetch if no requests
    },
    retry: false, // Don't retry on failure
    throwOnError: false, // Don't throw errors, just return empty array
  });
}
