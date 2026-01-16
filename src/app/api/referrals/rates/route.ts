export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchFxSaveRate, fetchWstEthRate } from "@/lib/referralRates";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseBlock(value: string | null): bigint | undefined {
  if (!value) return undefined;
  const n = BigInt(value);
  return n > 0n ? n : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").toLowerCase();
  const block = parseBlock(searchParams.get("block"));

  try {
    if (token === "fxsave") {
      const snapshot = await fetchFxSaveRate(block);
      return NextResponse.json({ snapshot });
    }
    if (token === "wsteth") {
      const snapshot = await fetchWstEthRate(block);
      return NextResponse.json({ snapshot });
    }
    return jsonError("Unsupported token");
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch rate snapshot" },
      { status: 500 }
    );
  }
}
