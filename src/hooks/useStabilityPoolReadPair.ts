"use client";

import { useContractRead } from "wagmi";
import { STABILITY_POOL_ABI } from "@/abis";

type PairArgs = {
  address: `0x${string}` | undefined;
  enabled: boolean;
  /** Name on StabilityPool v3. */
  v3FunctionName: string;
  /** Name on StabilityPool v2. Omit when the read exists only on v3. */
  v2FunctionName?: string;
  args?: readonly unknown[];
  refetchInterval?: number | false;
};

/**
 * Reads a pool view from v3, and from v2 when that name is different.
 * `fromV3` is true when the v3 call succeeded, so callers can tell a real
 * zero from a pool that does not have the v3 function.
 */
export function useStabilityPoolReadPair({
  address,
  enabled,
  v3FunctionName,
  v2FunctionName,
  args,
  refetchInterval = 30_000,
}: PairArgs) {
  const canRead = Boolean(address) && enabled;
  const v3 = useContractRead({
    address,
    abi: STABILITY_POOL_ABI,
    functionName: v3FunctionName as never,
    args: args as never,
    query: {
      enabled: canRead,
      refetchInterval,
      retry: 0,
    },
  });
  const v2 = useContractRead({
    address,
    abi: STABILITY_POOL_ABI,
    functionName: (v2FunctionName ?? v3FunctionName) as never,
    args: args as never,
    query: {
      enabled: canRead && Boolean(v2FunctionName),
      refetchInterval,
      retry: 0,
    },
  });

  const data = v3.isSuccess ? v3.data : v2.isSuccess ? v2.data : undefined;
  return {
    data,
    fromV3: v3.isSuccess,
    isFetched: v3.isFetched || v2.isFetched,
  };
}
