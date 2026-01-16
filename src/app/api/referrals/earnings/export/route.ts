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

    const referrers = await earningsStore.listReferrers();
    const rows: Array<{
      address: string;
      feeUsdE18: string;
      feeEthWei: string;
      yieldUsdE18: string;
      yieldEthWei: string;
      totalUsdE18: string;
      totalEthWei: string;
      marksPoints: string;
    }> = [];

    for (const referrer of referrers) {
      const totals = await earningsStore.getReferrerTotals(referrer);
      if (!totals) continue;
      const totalUsdE18 = totals.feeUsdE18 + totals.yieldUsdE18;
      if (totalUsdE18 < minUsdE18) continue;
      rows.push({
        address: referrer,
        feeUsdE18: totals.feeUsdE18.toString(),
        feeEthWei: totals.feeEthWei.toString(),
        yieldUsdE18: totals.yieldUsdE18.toString(),
        yieldEthWei: totals.yieldEthWei.toString(),
        totalUsdE18: totalUsdE18.toString(),
        totalEthWei: (totals.feeEthWei + totals.yieldEthWei).toString(),
        marksPoints: totals.marksPoints.toString(),
      });
    }

    if (format === "json") {
      return NextResponse.json({ minUsdE18: minUsdE18.toString(), rows });
    }

    const header = toCsvRow([
      "address",
      "feeUsdE18",
      "feeEthWei",
      "yieldUsdE18",
      "yieldEthWei",
      "totalUsdE18",
      "totalEthWei",
      "marksPoints",
    ]);
    const body = rows.map((row) =>
      toCsvRow([
        row.address,
        row.feeUsdE18,
        row.feeEthWei,
        row.yieldUsdE18,
        row.yieldEthWei,
        row.totalUsdE18,
        row.totalEthWei,
        row.marksPoints,
      ])
    );
    const csv = [header, ...body].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=referral-payouts.csv",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to export referral payouts" },
      { status: 500 }
    );
  }
}
