export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getReferralsStore, getReferralsStoreMode } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";

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
    const earnings = getReferralEarningsStore();
    const [codes, binding, rebate, totals, settings] = await Promise.all([
      store.listCodes(address),
      store.getBinding(address),
      earnings.getRebateStatus(address),
      earnings.getReferrerTotals(address),
      store.getSettings(),
    ]);

    return NextResponse.json({
      codes,
      binding,
      rebate,
      referrerTotals: totals,
      settings,
      store: getReferralsStoreMode(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load referral summary" },
      { status: 500 }
    );
  }
}
