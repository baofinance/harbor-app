"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract } from "wagmi";
import { HARBOR_TIDE_DISTRIBUTOR_ABI } from "@/abis/harborTideDistributor";
import { TIDE_CONFIG, type TideAirdropSnapshot } from "@/config/tide";
import { findTideAirdropAllocation } from "@/utils/tideSnapshot";

async function fetchAirdropSnapshot(): Promise<TideAirdropSnapshot> {
  const res = await fetch(TIDE_CONFIG.dataPaths.airdrop);
  if (!res.ok) {
    throw new Error("Failed to load airdrop snapshot");
  }
  return res.json() as Promise<TideAirdropSnapshot>;
}

export function useTideAirdropEligibility() {
  const { address, isConnected } = useAccount();

  const snapshotQuery = useQuery({
    queryKey: ["tideAirdropSnapshot", TIDE_CONFIG.dataPaths.airdrop],
    queryFn: fetchAirdropSnapshot,
    staleTime: 60_000,
  });

  const airdrop = findTideAirdropAllocation(snapshotQuery.data, address);

  const { data: startDate } = useReadContract({
    address: TIDE_CONFIG.distributorAddress,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "startDate",
    chainId: TIDE_CONFIG.chainId,
  });

  return {
    isConnected,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
    airdrop,
    buckets: airdrop?.buckets ?? null,
    totalTokens: airdrop?.totalTokens ?? 0,
    hasAllocation: airdrop !== null && (airdrop?.totalTokens ?? 0) > 0,
    airdropDate: startDate !== undefined ? Number(startDate) * 1000 : undefined,
  };
}
