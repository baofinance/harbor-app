"use client";

import { TIDE_CONFIG, type TideAirdropSnapshot } from "@/config/tide";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useTideDistributorWindow } from "@/hooks/useTideDistributorWindow";
import { useTideJsonSnapshot } from "@/hooks/useTideJsonSnapshot";
import {
  emptyTideAirdropBuckets,
  findTideAirdropAllocation,
} from "@/utils/tideSnapshot";

export function useTideAirdropEligibility() {
  const { address, isConnected } = useHarborAccount();
  const { airdropDateMs } = useTideDistributorWindow();

  const snapshotQuery = useTideJsonSnapshot<TideAirdropSnapshot>(
    TIDE_CONFIG.dataPaths.airdrop
  );

  const airdrop = findTideAirdropAllocation(snapshotQuery.data, address);
  const isLoading = isConnected && snapshotQuery.isLoading;
  const buckets =
    isConnected && !snapshotQuery.isLoading
      ? (airdrop?.buckets ?? emptyTideAirdropBuckets())
      : emptyTideAirdropBuckets();
  const totalTokens =
    isConnected && airdrop ? (airdrop.totalTokens ?? 0) : 0;

  return {
    isConnected,
    isLoading,
    isError: snapshotQuery.isError,
    airdrop,
    buckets,
    totalTokens,
    hasAllocation: airdrop !== null && (airdrop?.totalTokens ?? 0) > 0,
    airdropDate: airdropDateMs,
  };
}
