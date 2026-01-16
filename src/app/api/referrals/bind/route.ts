export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress, verifyTypedData } from "viem";
import { getReferralsStore, validateReferralCode } from "@/lib/referralsStore";
import { hasPriorDeposits } from "@/lib/referralGraph";
import {
  buildReferralBindTypedData,
  type ReferralBindMessage,
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
    const binding = await store.getBinding(address);
    return NextResponse.json({ binding });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch referral binding" },
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

  const referred = (body?.referred || "").trim();
  const codeRaw = String(body?.code || "");
  const nonce = String(body?.nonce || "");
  const signature = String(body?.signature || "");
  const depositTxHash = body?.depositTxHash
    ? String(body?.depositTxHash)
    : undefined;

  if (!isAddress(referred)) return jsonError("Invalid referred address");
  if (!nonce) return jsonError("Missing nonce");
  if (!signature) return jsonError("Missing signature");

  let code: string;
  try {
    code = validateReferralCode(codeRaw);
  } catch (err: any) {
    return jsonError(err?.message || "Invalid referral code");
  }

  try {
    const store = getReferralsStore();
    if (depositTxHash) {
      const alreadyDeposited = await hasPriorDeposits(referred);
      if (alreadyDeposited) {
        return jsonError("Referral only applies to new depositors", 403);
      }
    }
    const typed = buildReferralBindTypedData({
      referred,
      code,
      nonce,
    } as ReferralBindMessage);

    const valid = await verifyTypedData({
      address: referred,
      domain: typed.domain,
      types: typed.types as any,
      primaryType: typed.primaryType,
      message: typed.message as any,
      signature: signature as any,
    });

    if (!valid) return jsonError("Invalid signature", 401);

    const ok = await store.consumeNonce(referred, nonce);
    if (!ok) return jsonError("Invalid or expired nonce", 401);

    const binding = await store.bindReferral(referred, code, {
      depositTxHash,
    });
    return NextResponse.json({ binding });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to bind referral" },
      { status: 500 }
    );
  }
}
