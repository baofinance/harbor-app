export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { syncMarksShares } from "@/lib/referralMarksService";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const graphUrlOverride = (searchParams.get("graphUrl") || "").trim() || undefined;
    const result = await syncMarksShares(graphUrlOverride);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to sync marks shares" },
      { status: 500 }
    );
  }
}
