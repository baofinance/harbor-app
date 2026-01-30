export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getReferralsStore, getReferralsStoreMode } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serializeRebate(rebate: any | null) {
  if (!rebate) return null;
  return {
    ...rebate,
    totalUsdE18: rebate.totalUsdE18?.toString?.() ?? rebate.totalUsdE18,
    totalEthWei: rebate.totalEthWei?.toString?.() ?? rebate.totalEthWei,
  };
}

function serializeReferrerTotals(totals: any | null) {
  if (!totals) return null;
  return {
    ...totals,
    feeUsdE18: totals.feeUsdE18?.toString?.() ?? totals.feeUsdE18,
    feeEthWei: totals.feeEthWei?.toString?.() ?? totals.feeEthWei,
    yieldUsdE18: totals.yieldUsdE18?.toString?.() ?? totals.yieldUsdE18,
    yieldEthWei: totals.yieldEthWei?.toString?.() ?? totals.yieldEthWei,
    marksPoints: totals.marksPoints?.toString?.() ?? totals.marksPoints,
  };
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
      rebate: serializeRebate(rebate),
      referrerTotals: serializeReferrerTotals(totals),
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
