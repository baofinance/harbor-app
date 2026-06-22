import type { TideAllocationSnapshot } from "@/config/tide";

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
