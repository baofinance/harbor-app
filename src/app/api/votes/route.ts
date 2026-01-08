export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress, verifyTypedData, type Address } from "viem";
import { getVotesStore } from "@/lib/votesStore";
import {
  buildVoteTypedData,
  normalizeAllocationsForSigning,
  sumAllocationPoints,
  VOTE_POINTS_MAX,
  type VoteAllocation,
} from "@/lib/votesTypedData";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const feedIdsParam = searchParams.get("feedIds") || "";
  const feedIds = feedIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const address = (searchParams.get("address") || "").trim();
  const includeAllocations = isAddress(address);

  try {
    const store = getVotesStore();
    const totals = await store.getTotals(feedIds);
    if (!includeAllocations) {
      return NextResponse.json({ totals });
    }
    const allocations = await store.getAllocations(address as Address);
    return NextResponse.json({ totals, allocations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch votes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const voter = (body?.voter || "").trim();
  const nonce = String(body?.nonce || "");
  const signature = String(body?.signature || "");
  const allocationsRaw = Array.isArray(body?.allocations)
    ? body.allocations
    : [];

  if (!isAddress(voter)) return jsonError("Invalid voter address");
  if (!nonce) return jsonError("Missing nonce");
  if (!signature) return jsonError("Missing signature");

  const allocations: VoteAllocation[] = allocationsRaw.map((a: any) => ({
    feedId: String(a?.feedId || ""),
    points: Number(a?.points || 0),
  }));
  const normalized = normalizeAllocationsForSigning(allocations);
  const total = sumAllocationPoints(normalized);
  if (total > VOTE_POINTS_MAX) {
    return jsonError(`Total vote points cannot exceed ${VOTE_POINTS_MAX}`);
  }

  try {
    const store = getVotesStore();

    const typed = buildVoteTypedData({
      voter: voter as Address,
      nonce,
      allocations: normalized,
    });

    const valid = await verifyTypedData({
      address: voter as Address,
      domain: typed.domain,
      types: typed.types as any,
      primaryType: typed.primaryType,
      message: typed.message as any,
      signature: signature as any,
    });

    if (!valid) return jsonError("Invalid signature", 401);

    // One-time nonce check to prevent replay (consume only after signature verifies)
    const ok = await store.consumeNonce(voter as Address, nonce);
    if (!ok) return jsonError("Invalid or expired nonce", 401);

    const nextMap: Record<string, number> = {};
    for (const a of normalized) nextMap[a.feedId] = a.points;

    const { totals, allocations: storedAllocations } =
      await store.setAllocations(voter as Address, nextMap);

    return NextResponse.json({ totals, allocations: storedAllocations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save votes" },
      { status: 500 }
    );
  }
}
