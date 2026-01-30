export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { type FeeOperation } from "@/lib/referralFees";
import { getWrappedTokenForMinter } from "@/lib/referralMarkets";
import { recordReferralFee } from "@/lib/referralFeeRecorder";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const allowedOperations: FeeOperation[] = [
  "MINT_PEGGED",
  "MINT_LEVERAGED",
  "REDEEM_PEGGED",
  "REDEEM_LEVERAGED",
];

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

  const user = (body?.user || "").trim();
  const txHash = String(body?.txHash || "");
  const minter = (body?.minter || "").trim();
  const operation = body?.operation as FeeOperation;
  const amount = body?.amount;
  const blockNumber = body?.blockNumber ? BigInt(body.blockNumber) : undefined;

  if (!isAddress(user)) return jsonError("Invalid user address");
  if (!isAddress(minter)) return jsonError("Invalid minter address");
  if (!txHash) return jsonError("Missing txHash");
  if (!allowedOperations.includes(operation)) return jsonError("Invalid operation");
  if (amount === undefined || amount === null) {
    return jsonError("Missing amount");
  }

  let amountValue: bigint;
  try {
    amountValue = BigInt(amount);
  } catch {
    return jsonError("Invalid amount");
  }

  try {
    const token = getWrappedTokenForMinter(minter);
    if (!token) {
      return jsonError("Unsupported market", 400);
    }
    const result = await recordReferralFee({
      user,
      txHash,
      minter,
      operation,
      amount: amountValue,
      blockNumber,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to record referral fee" },
      { status: 500 }
    );
  }
}
