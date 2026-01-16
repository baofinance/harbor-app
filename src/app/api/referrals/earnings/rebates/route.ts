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

    const users = await earningsStore.listRebateUsers();
    const rebates: Array<{
      user: string;
      usedCount: number;
      totalUsdE18: string;
      totalEthWei: string;
      eligible: boolean;
    }> = [];

    for (const user of users) {
      const status = await earningsStore.getRebateStatus(user);
      if (!status) continue;
      rebates.push({
        user,
        usedCount: status.usedCount,
        totalUsdE18: status.totalUsdE18.toString(),
        totalEthWei: status.totalEthWei.toString(),
        eligible: status.totalUsdE18 >= minUsdE18,
      });
    }

    return NextResponse.json({ minUsdE18: minUsdE18.toString(), rebates });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch referral rebates" },
      { status: 500 }
    );
  }
}
