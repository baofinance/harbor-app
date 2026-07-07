"use client";

import { TIDE_CONFIG, type TideAirdropSnapshot, type TideBoostersSnapshot } from "@/config/tide";
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
  const boostersQuery = useTideJsonSnapshot<TideBoostersSnapshot>(
    TIDE_CONFIG.dataPaths.boosters
  );

  const airdrop = findTideAirdropAllocation(
    snapshotQuery.data,
    address,
    boostersQuery.data
  );
  const isLoading =
    isConnected && (snapshotQuery.isLoading || boostersQuery.isLoading);
  const buckets =
    isConnected && !isLoading
      ? (airdrop?.buckets ?? emptyTideAirdropBuckets())
      : emptyTideAirdropBuckets();
  const totalTokens =
    isConnected && airdrop ? (airdrop.totalTokens ?? 0) : 0;
  const boostersPending =
    (boostersQuery.data?.pendingAddressCount ?? 0) > 0;

  return {
    isConnected,
    isLoading,
    isError: snapshotQuery.isError || boostersQuery.isError,
    airdrop,
    buckets,
    totalTokens,
    hasAllocation: airdrop !== null && (airdrop?.totalTokens ?? 0) > 0,
    airdropDate: airdropDateMs,
    boostersPending,
    boostersSnapshot: boostersQuery.data,
  };
}
