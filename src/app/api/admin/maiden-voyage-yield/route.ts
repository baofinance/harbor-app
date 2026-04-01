export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { assertMaidenVoyageYieldAdmin } from "@/lib/maidenVoyageYieldAdminAuth";
import { getMaidenVoyageYieldLedgerStore } from "@/lib/maidenVoyageYieldLedgerStore";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type LedgerBody = {
  action: "ledger" | "record";
  genesis: string;
  adminAddress?: string;
  signature?: `0x${string}`;
  timestamp?: number;
  distributions?: Array<{
    wallet: string;
    amountUSD: string | number;
    txHash?: string;
    notes?: string;
  }>;
};

export async function POST(req: Request) {
  let body: LedgerBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const genesisRaw = (body?.genesis || "").trim();
  if (!isAddress(genesisRaw)) {
    return jsonError("Invalid genesis address", 400);
  }
  const genesis = genesisRaw as Address;

  const action = body?.action;
  if (action !== "ledger" && action !== "record") {
    return jsonError("Invalid action", 400);
  }

  try {
    await assertMaidenVoyageYieldAdmin({
      req,
      genesis,
      adminAddress: body.adminAddress as Address | undefined,
      signature: body.signature,
      timestampSec: body.timestamp,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg.startsWith("FORBIDDEN:") ? 403 : 401;
    const clean = msg.replace(/^(ADMIN_AUTH|FORBIDDEN):\s*/, "");
    return jsonError(clean, status);
  }

  const storeMode =
    process.env.MAIDEN_VYIELD_STORE === "memory" ||
    process.env.VOTES_STORE === "memory" ||
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
      ? "memory"
      : "upstash";

  try {
    const store = getMaidenVoyageYieldLedgerStore();
    if (action === "ledger") {
      const ledger = await store.getLedger(genesis);
      return NextResponse.json({ ledger, store: storeMode });
    }

    const dist = body.distributions;
    if (!Array.isArray(dist) || dist.length === 0) {
      return jsonError("distributions required", 400);
    }
    const normalized: Array<{
      wallet: Address;
      amountUSD: number;
      txHash?: string;
      notes?: string;
    }> = [];
    for (const row of dist) {
      const w = (row.wallet || "").trim();
      if (!isAddress(w)) {
        return jsonError(`Invalid wallet: ${row.wallet}`, 400);
      }
      const amt = Number(row.amountUSD);
      if (!Number.isFinite(amt) || amt <= 0) {
        return jsonError("Invalid amountUSD", 400);
      }
      normalized.push({
        wallet: w as Address,
        amountUSD: amt,
        txHash: row.txHash?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      });
    }

    const ledger = await store.recordDistributions(genesis, normalized);
    return NextResponse.json({ ledger, store: storeMode });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ledger error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
