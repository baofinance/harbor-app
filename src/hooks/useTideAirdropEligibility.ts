"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract } from "wagmi";
import { HARBOR_TIDE_DISTRIBUTOR_ABI } from "@/abis/harborTideDistributor";
import {
  TIDE_CONFIG,
  type TideAllocationSnapshot,
} from "@/config/tide";
import { findTideAllocation } from "@/utils/tideSnapshot";

async function fetchAirdropSnapshot(): Promise<TideAllocationSnapshot> {
  const res = await fetch(TIDE_CONFIG.dataPaths.airdrop);
  if (!res.ok) {
    throw new Error("Failed to load airdrop snapshot");
  }
  return res.json() as Promise<TideAllocationSnapshot>;
}

export function useTideAirdropEligibility() {
  const { address, isConnected } = useAccount();

  const snapshotQuery = useQuery({
    queryKey: ["tideAirdropSnapshot", TIDE_CONFIG.dataPaths.airdrop],
    queryFn: fetchAirdropSnapshot,
    staleTime: 60_000,
  });

  const allocation = findTideAllocation(snapshotQuery.data, address);

  const { data: startDate } = useReadContract({
    address: TIDE_CONFIG.distributorAddress,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "startDate",
    chainId: TIDE_CONFIG.chainId,
    query: { enabled: isConnected },
  });

  return {
    isConnected,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
    allocation,
    hasAllocation:
      allocation !== null &&
      allocation.amountTokens > 0 &&
      BigInt(allocation.amount) > 0n,
    airdropDate: startDate !== undefined ? Number(startDate) * 1000 : undefined,
    snapshotBlock: snapshotQuery.data?.snapshotBlock,
  };
}
