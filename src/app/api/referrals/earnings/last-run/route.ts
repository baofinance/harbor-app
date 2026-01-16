export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getReferralMetaStore } from "@/lib/referralSyncStore";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const store = getReferralMetaStore();
    const value = await store.getMeta("lastRun");
    return NextResponse.json({ lastRun: value });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load last run" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const store = getReferralMetaStore();
    const ts = Date.now().toString();
    await store.setMeta("lastRun", ts);
    return NextResponse.json({ lastRun: ts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save last run" },
      { status: 500 }
    );
  }
}
