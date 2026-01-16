export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";

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
    const referralStore = getReferralsStore();
    const earningsStore = getReferralEarningsStore();
    const settings = await referralStore.getSettings();
    const minUsdE18 = BigInt(Math.round(settings.minPayoutUsd * 1e18));

    const referrers = await earningsStore.listReferrers();
    const payouts: Array<{
      referrer: string;
      feeUsdE18: string;
      feeEthWei: string;
      yieldUsdE18: string;
      yieldEthWei: string;
      totalUsdE18: string;
      totalEthWei: string;
      marksPoints: string;
      eligible: boolean;
    }> = [];

    for (const referrer of referrers) {
      const totals = await earningsStore.getReferrerTotals(referrer);
      if (!totals) continue;
      const totalUsdE18 = totals.feeUsdE18 + totals.yieldUsdE18;
      const totalEthWei = totals.feeEthWei + totals.yieldEthWei;
      payouts.push({
        referrer,
        feeUsdE18: totals.feeUsdE18.toString(),
        feeEthWei: totals.feeEthWei.toString(),
        yieldUsdE18: totals.yieldUsdE18.toString(),
        yieldEthWei: totals.yieldEthWei.toString(),
        totalUsdE18: totalUsdE18.toString(),
        totalEthWei: totalEthWei.toString(),
        marksPoints: totals.marksPoints.toString(),
        eligible: totalUsdE18 >= minUsdE18,
      });
    }

    return NextResponse.json({ minUsdE18: minUsdE18.toString(), payouts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch referral payouts" },
      { status: 500 }
    );
  }
}
