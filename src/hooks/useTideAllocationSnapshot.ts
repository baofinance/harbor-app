"use client";

import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useTideJsonSnapshot } from "@/hooks/useTideJsonSnapshot";
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

function useAllocationFromSnapshot(
  path: TideAllocationPath,
  snapshot: TideAllocationSnapshot | undefined,
  isLoading: boolean,
  isError: boolean
) {
  const { address, isConnected } = useHarborAccount();
  const allocation: TideClaimAllocation | null = findTideAllocation(
    snapshot,
    address
  );

  return {
    path,
    isConnected,
    address,
    isLoading,
    isError,
    allocation,
    snapshot,
    hasAllocation:
      allocation !== null &&
      allocation.amountTokens > 0 &&
      BigInt(allocation.amount) > 0n,
    hasProof: Boolean(allocation?.proof?.length),
  };
}

/** Loads a merkle allocation JSON for veBAO or standard claim paths. */
export function useTideAllocationSnapshot(path: TideAllocationPath) {
  const dataPath = ALLOCATION_PATHS[path];
  const snapshotQuery = useTideJsonSnapshot<TideAllocationSnapshot>(dataPath);

  return useAllocationFromSnapshot(
    path,
    snapshotQuery.data,
    snapshotQuery.isLoading,
    snapshotQuery.isError
  );
}

/** Both claim paths — React Query dedupes when JSON paths match. */
export function useTideClaimSnapshots() {
  const veBaoQuery = useTideJsonSnapshot<TideAllocationSnapshot>(
    ALLOCATION_PATHS.veBao
  );
  const standardQuery = useTideJsonSnapshot<TideAllocationSnapshot>(
    ALLOCATION_PATHS.standard
  );

  return {
    veBao: useAllocationFromSnapshot(
      "veBao",
      veBaoQuery.data,
      veBaoQuery.isLoading,
      veBaoQuery.isError
    ),
    standard: useAllocationFromSnapshot(
      "standard",
      standardQuery.data,
      standardQuery.isLoading,
      standardQuery.isError
    ),
  };
}
