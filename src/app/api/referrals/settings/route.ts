export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getReferralsStore } from "@/lib/referralsStore";

export async function GET() {
  try {
    const store = getReferralsStore();
    const settings = await store.getSettings();
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load referral settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const store = getReferralsStore();
    const settings = await store.setSettings(body || {});
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update referral settings" },
      { status: 500 }
    );
  }
}
