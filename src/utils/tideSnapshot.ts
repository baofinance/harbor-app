import type {
  TideAirdropAllocationRow,
  TideAirdropBucketAmount,
  TideAirdropBucketKey,
  TideAirdropSnapshot,
  TideAllocationSnapshot,
  TideBoostersSnapshot,
} from "@/config/tide";
import { TIDE_AIRDROP_BUCKETS } from "@/config/tide";

export function findTideAllocation(
  snapshot: TideAllocationSnapshot | undefined,
  wallet: string | undefined
) {
  if (!snapshot || !wallet) return null;
  const key = wallet.toLowerCase();
  return (
    snapshot.allocations.find((row) => row.address.toLowerCase() === key) ??
    null
  );
}

export function formatTideTokenAmount(amountTokens: number): string {
  return amountTokens.toLocaleString(undefined, {
    maximumFractionDigits: amountTokens >= 1000 ? 0 : 2,
  });
}

export function hasTideAllocation(row: { amountTokens: number } | null): boolean {
  return row !== null && row.amountTokens > 0;
}

export function emptyTideAirdropBuckets(): Record<
  TideAirdropBucketKey,
  TideAirdropBucketAmount
> {
  return TIDE_AIRDROP_BUCKETS.reduce(
    (acc, { key }) => {
      acc[key] = { amountTokens: 0 };
      return acc;
    },
    {} as Record<TideAirdropBucketKey, TideAirdropBucketAmount>
  );
}

export function normalizeTideAirdropBuckets(
  row: TideAirdropAllocationRow
): Record<TideAirdropBucketKey, TideAirdropBucketAmount> {
  const empty = (): TideAirdropBucketAmount => ({ amountTokens: 0 });

  if (row.buckets) {
    return TIDE_AIRDROP_BUCKETS.reduce(
      (acc, { key }) => {
        acc[key] = row.buckets?.[key] ?? empty();
        return acc;
      },
      {} as Record<TideAirdropBucketKey, TideAirdropBucketAmount>
    );
  }

  const legacyTokens = row.amountTokens ?? 0;
  return {
    veBaoSnapshot: {
      amount: row.amount,
      amountTokens: legacyTokens,
    },
    boosters: empty(),
    raise: empty(),
    ledgerMarks: empty(),
  };
}

export function sumTideAirdropTokens(
  buckets: Record<TideAirdropBucketKey, TideAirdropBucketAmount>
): number {
  return TIDE_AIRDROP_BUCKETS.reduce(
    (sum, { key }) => sum + (buckets[key]?.amountTokens ?? 0),
    0
  );
}

export function findTideBoosterAllocation(
  snapshot: TideBoostersSnapshot | undefined,
  wallet: string | undefined
) {
  if (!snapshot || !wallet) return null;
  const key = wallet.toLowerCase();
  return (
    snapshot.allocations.find(
      (row) => row.address && row.address.toLowerCase() === key
    ) ?? null
  );
}

export function mergeBoostersIntoAirdropBuckets(
  buckets: Record<TideAirdropBucketKey, TideAirdropBucketAmount>,
  booster: { amount: string; amountTokens: number } | null
): Record<TideAirdropBucketKey, TideAirdropBucketAmount> {
  if (!booster) return buckets;
  return {
    ...buckets,
    boosters: {
      amount: booster.amount,
      amountTokens: booster.amountTokens,
    },
  };
}

export function findTideAirdropAllocation(
  snapshot: TideAirdropSnapshot | undefined,
  wallet: string | undefined,
  boostersSnapshot?: TideBoostersSnapshot
) {
  if (!snapshot || !wallet) return null;
  const key = wallet.toLowerCase();
  const row =
    snapshot.allocations.find((entry) => entry.address.toLowerCase() === key) ??
    null;

  const boosterOnly = findTideBoosterAllocation(boostersSnapshot, wallet);
  if (!row && !boosterOnly) return null;

  const buckets = mergeBoostersIntoAirdropBuckets(
    row ? normalizeTideAirdropBuckets(row) : emptyTideAirdropBuckets(),
    boosterOnly
  );

  return {
    row: row ?? { address: wallet, buckets },
    buckets,
    totalTokens: sumTideAirdropTokens(buckets),
    boosterRank: boosterOnly?.rank,
  };
}
