export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getReferralsStore } from "@/lib/referralsStore";
import { hasPriorDeposits } from "@/lib/referralGraph";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const referred = (body?.referred || "").trim();
  const depositTxHash = String(body?.depositTxHash || "");

  if (!isAddress(referred)) return jsonError("Invalid referred address");
  if (!depositTxHash) return jsonError("Missing depositTxHash");

  try {
    const alreadyDeposited = await hasPriorDeposits(referred);
    if (alreadyDeposited) {
      return jsonError("Referral only applies to new depositors", 403);
    }

    const store = getReferralsStore();
    const binding = await store.confirmBinding(referred, depositTxHash);
    return NextResponse.json({ binding });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to confirm referral binding" },
      { status: 500 }
    );
  }
}
