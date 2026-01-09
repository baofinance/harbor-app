import type { Address } from "viem";

export const VOTE_POINTS_MAX = 5 as const;

export type VoteAllocation = {
  feedId: string;
  points: number;
};

export function normalizeAllocationsForSigning(
  allocations: VoteAllocation[]
): VoteAllocation[] {
  const map = new Map<string, number>();
  for (const a of allocations || []) {
    const feedId = String(a.feedId || "").trim();
    if (!feedId) continue;
    const points = Math.floor(Number(a.points));
    if (!Number.isFinite(points) || points <= 0) continue;
    map.set(feedId, Math.min(VOTE_POINTS_MAX, points));
  }
  const out = Array.from(map.entries())
    .map(([feedId, points]) => ({ feedId, points }))
    .sort((a, b) => a.feedId.localeCompare(b.feedId));
  return out;
}

export function sumAllocationPoints(allocations: VoteAllocation[]): number {
  return allocations.reduce((s, a) => s + (Number.isFinite(a.points) ? a.points : 0), 0);
}

export function buildVoteTypedData(params: {
  voter: Address;
  nonce: string;
  allocations: VoteAllocation[];
}) {
  const allocations = normalizeAllocationsForSigning(params.allocations);

  return {
    domain: {
      name: "Harbor Map Room Votes",
      version: "1",
      // Not chain-dependent; just needs to be deterministic for signatures.
      chainId: 1,
    },
    types: {
      VoteAllocation: [
        { name: "feedId", type: "string" },
        { name: "points", type: "uint8" },
      ],
      VoteRequest: [
        { name: "voter", type: "address" },
        { name: "nonce", type: "string" },
        { name: "allocations", type: "VoteAllocation[]" },
      ],
    },
    primaryType: "VoteRequest" as const,
    message: {
      voter: params.voter,
      nonce: params.nonce,
      allocations,
    },
  };
}


