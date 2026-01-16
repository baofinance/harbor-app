export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { calculateFeeFromDryRun, type FeeOperation } from "@/lib/referralFees";

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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const minter = (body?.minter || "").trim();
  const operation = body?.operation as FeeOperation;
  const amount = body?.amount;
  const blockNumber = body?.blockNumber ? BigInt(body.blockNumber) : undefined;

  if (!isAddress(minter)) return jsonError("Invalid minter address");
  if (!allowedOperations.includes(operation)) {
    return jsonError("Invalid operation");
  }
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
    const result = await calculateFeeFromDryRun({
      minter,
      operation,
      amount: amountValue,
      blockNumber,
    });
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to run dry-run fee calculation" },
      { status: 500 }
    );
  }
}
