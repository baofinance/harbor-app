export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toCsvRow(values: string[]) {
  return values
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",");
}

export async function GET(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  try {
    const referralStore = getReferralsStore();
    const earningsStore = getReferralEarningsStore();
    const settings = await referralStore.getSettings();
    const minUsdE18 = BigInt(Math.round(settings.minPayoutUsd * 1e18));

    const rows: Array<{
      address: string;
      type: "referrer" | "rebate";
      usdE18: string;
      ethWei: string;
    }> = [];

    const referrers = await earningsStore.listReferrers();
    for (const referrer of referrers) {
      const totals = await earningsStore.getReferrerTotals(referrer);
      if (!totals) continue;
      const totalUsdE18 = totals.feeUsdE18 + totals.yieldUsdE18;
      if (totalUsdE18 < minUsdE18) continue;
      rows.push({
        address: referrer,
        type: "referrer",
        usdE18: totalUsdE18.toString(),
        ethWei: (totals.feeEthWei + totals.yieldEthWei).toString(),
      });
    }

    const rebateUsers = await earningsStore.listRebateUsers();
    for (const user of rebateUsers) {
      const rebate = await earningsStore.getRebateStatus(user);
      if (!rebate) continue;
      if (rebate.totalUsdE18 < minUsdE18) continue;
      rows.push({
        address: user,
        type: "rebate",
        usdE18: rebate.totalUsdE18.toString(),
        ethWei: rebate.totalEthWei.toString(),
      });
    }

    if (format === "json") {
      return NextResponse.json({ minUsdE18: minUsdE18.toString(), rows });
    }

    const header = toCsvRow(["address", "type", "usdE18", "ethWei"]);
    const body = rows.map((row) =>
      toCsvRow([row.address, row.type, row.usdE18, row.ethWei])
    );
    const csv = [header, ...body].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=referral-batch.csv",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to export referral batch" },
      { status: 500 }
    );
  }
}
