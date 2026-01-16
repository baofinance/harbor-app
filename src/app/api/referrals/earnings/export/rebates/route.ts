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

    const users = await earningsStore.listRebateUsers();
    const rows: Array<{
      user: string;
      usedCount: number;
      totalUsdE18: string;
      totalEthWei: string;
    }> = [];

    for (const user of users) {
      const status = await earningsStore.getRebateStatus(user);
      if (!status) continue;
      if (status.totalUsdE18 < minUsdE18) continue;
      rows.push({
        user,
        usedCount: status.usedCount,
        totalUsdE18: status.totalUsdE18.toString(),
        totalEthWei: status.totalEthWei.toString(),
      });
    }

    if (format === "json") {
      return NextResponse.json({ minUsdE18: minUsdE18.toString(), rows });
    }

    const header = toCsvRow(["user", "usedCount", "totalUsdE18", "totalEthWei"]);
    const body = rows.map((row) =>
      toCsvRow([row.user, String(row.usedCount), row.totalUsdE18, row.totalEthWei])
    );
    const csv = [header, ...body].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=referral-rebates.csv",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to export referral rebates" },
      { status: 500 }
    );
  }
}
