"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  TIDE_CONFIG,
  type TideAllocationSnapshot,
  type TideClaimAllocation,
} from "@/config/tide";
import { findTideAllocation } from "@/utils/tideSnapshot";

export type TideAllocationPath = "veBao" | "standard";

const ALLOCATION_PATHS: Record<TideAllocationPath, string> = {
  veBao: TIDE_CONFIG.dataPaths.veBaoAllocation,
  standard: TIDE_CONFIG.dataPaths.standardAllocation,
};

async function fetchAllocationSnapshot(
  url: string
): Promise<TideAllocationSnapshot> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load TIDE allocation snapshot");
  }
  return res.json() as Promise<TideAllocationSnapshot>;
}

/** Loads a merkle allocation JSON for veBAO or standard claim paths. */
export function useTideAllocationSnapshot(path: TideAllocationPath) {
  const { address, isConnected } = useAccount();
  const dataPath = ALLOCATION_PATHS[path];

  const snapshotQuery = useQuery({
    queryKey: ["tideAllocationSnapshot", path, dataPath],
    queryFn: () => fetchAllocationSnapshot(dataPath),
    staleTime: 60_000,
  });

  const allocation: TideClaimAllocation | null = findTideAllocation(
    snapshotQuery.data,
    address
  );

  return {
    path,
    isConnected,
    address,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
    allocation,
    snapshot: snapshotQuery.data,
    hasAllocation:
      allocation !== null &&
      allocation.amountTokens > 0 &&
      BigInt(allocation.amount) > 0n,
    hasProof: Boolean(allocation?.proof?.length),
  };
}
