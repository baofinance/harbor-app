export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress, verifyTypedData } from "viem";
import { getReferralsStore, getReferralsStoreMode } from "@/lib/referralsStore";
import {
  buildReferralCodeCreateTypedData,
  type ReferralCodeCreateMessage,
} from "@/lib/referralsTypedData";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").trim();

  if (!isAddress(address)) {
    return jsonError("Invalid address");
  }

  try {
    const store = getReferralsStore();
    const codes = await store.listCodes(address);
    return NextResponse.json({ codes, store: getReferralsStoreMode() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch referral codes" },
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

  const referrer = (body?.referrer || "").trim();
  const nonce = String(body?.nonce || "");
  const signature = String(body?.signature || "");
  const label = String(body?.label || "");

  if (!isAddress(referrer)) return jsonError("Invalid referrer address");
  if (!nonce) return jsonError("Missing nonce");
  if (!signature) return jsonError("Missing signature");

  try {
    const store = getReferralsStore();
    const typed = buildReferralCodeCreateTypedData({
      referrer,
      nonce,
      label,
    } as ReferralCodeCreateMessage);

    const valid = await verifyTypedData({
      address: referrer,
      domain: typed.domain,
      types: typed.types as any,
      primaryType: typed.primaryType,
      message: typed.message as any,
      signature: signature as any,
    });

    if (!valid) return jsonError("Invalid signature", 401);

    const ok = await store.consumeNonce(referrer, nonce);
    if (!ok) return jsonError("Invalid or expired nonce", 401);

    const code = await store.createCode(referrer, label);
    return NextResponse.json({ code, store: getReferralsStoreMode() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create referral code" },
      { status: 500 }
    );
  }
}
