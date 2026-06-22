import type { TideClaimAllocation } from "@/config/tide";

export function normalizeMerkleProof(
  proof: string[] | undefined
): `0x${string}`[] | null {
  if (!proof?.length) return null;
  return proof.map((item) => {
    const trimmed = item.trim();
    if (!trimmed.startsWith("0x")) {
      return `0x${trimmed}` as `0x${string}`;
    }
    return trimmed as `0x${string}`;
  });
}

export function getTideAmountWei(
  allocation: TideClaimAllocation | null | undefined
): bigint | undefined {
  if (!allocation?.amount) return undefined;
  try {
    const value = BigInt(allocation.amount);
    return value > 0n ? value : undefined;
  } catch {
    return undefined;
  }
}
