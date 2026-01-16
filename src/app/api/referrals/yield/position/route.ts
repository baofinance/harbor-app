export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { type YieldToken } from "@/lib/referralYield";
import { getReferralYieldStore } from "@/lib/referralYieldStore";
import { updateYieldPosition } from "@/lib/referralYieldService";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseToken(token: string): YieldToken | null {
  const t = token.toLowerCase();
  if (t === "fxsave") return "fxSAVE";
  if (t === "wsteth") return "wstETH";
  return null;
}

function parseBlock(value: string | null): bigint | undefined {
  if (!value) return undefined;
  const n = BigInt(value);
  return n > 0n ? n : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").trim();
  const token = parseToken(searchParams.get("token") || "");

  if (!isAddress(address)) return jsonError("Invalid address");
  if (!token) return jsonError("Unsupported token");

  try {
    const store = getReferralYieldStore();
    const position = await store.getPosition(address, token);
    const totals = await store.getTotals(address, token);
    return NextResponse.json({ position, totals });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch yield position" },
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

  const address = (body?.address || "").trim();
  const token = parseToken(body?.token || "");
  const deltaWrapped = body?.deltaWrapped;
  const blockNumber = parseBlock(body?.blockNumber ? String(body.blockNumber) : null);

  if (!isAddress(address)) return jsonError("Invalid address");
  if (!token) return jsonError("Unsupported token");
  if (deltaWrapped === undefined || deltaWrapped === null) {
    return jsonError("Missing deltaWrapped");
  }

  let delta: bigint;
  try {
    delta = BigInt(deltaWrapped);
  } catch {
    return jsonError("Invalid deltaWrapped");
  }

  try {
    const update = await updateYieldPosition({
      address,
      token,
      deltaWrapped: delta,
      blockNumber,
    });

    return NextResponse.json({
      position: update.position,
      accrual: update.accrual,
      snapshot: update.snapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update yield position" },
      { status: 500 }
    );
  }
}
