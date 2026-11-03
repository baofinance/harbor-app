import { usePublicClient } from "wagmi";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useQuery } from "@tanstack/react-query";

import { redactForLog } from "@/utils/redactUrl";

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
  const { address } = useHarborAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["withdrawal-requests", address, poolAddresses],
    queryFn: async () => {
      if (!address || !poolAddresses.length) return [];

      const client = false ? publicClient : publicClient;
      if (!client) {
        console.debug("No client available for withdrawal requests");
        return [];
      }

      const requests: WithdrawalRequest[] = [];

      for (const poolAddress of poolAddresses) {
        try {
          // v3 name first. v2 pools revert it and still answer getWithdrawalRequest.
          let start = 0n;
          let end = 0n;
          try {
            const request = (await client.readContract({
              address: poolAddress,
              abi: stabilityPoolABI,
              functionName: "withdrawalRequest",
              args: [address],
            })) as [bigint, bigint];
            start = BigInt(request[0]);
            end = BigInt(request[1]);
          } catch {
            const request = (await client.readContract({
              address: poolAddress,
              abi: stabilityPoolABI,
              functionName: "getWithdrawalRequest",
              args: [address],
            })) as [bigint, bigint];
            start = BigInt(request[0]);
            end = BigInt(request[1]);
          }

          // If no request, skip
          if (!start || !end || (start === 0n && end === 0n)) {
            continue;
          }

          // Early withdrawal fee (best-effort)
          let earlyWithdrawFee: bigint = 0n;
          try {
            earlyWithdrawFee = (await client.readContract({
              address: poolAddress,
              abi: stabilityPoolABI,
              functionName: "earlyWithdrawalFeeRatio",
            })) as bigint;
          } catch {
            try {
              earlyWithdrawFee = (await client.readContract({
                address: poolAddress,
                abi: stabilityPoolABI,
                functionName: "getEarlyWithdrawalFee",
              })) as bigint;
            } catch {
              earlyWithdrawFee = 0n;
            }
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

          // Log unexpected errors at debug level (redact any URL in error message)
          console.debug(
            `Skipping withdrawal request check for ${poolAddress}:`,
            redactForLog(errorMessage)
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
        return 15_000; // 15s - withdrawal windows don't change minute-to-minute
      }
      return false; // Don't refetch if no requests
    },
    staleTime: 3000, // Consider data stale after 3 seconds
    retry: false, // Don't retry on failure
    throwOnError: false, // Don't throw errors, just return empty array
  });
}
