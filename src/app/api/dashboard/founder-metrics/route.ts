import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { getMaidenVoyageYieldLedgerStore } from "@/lib/maidenVoyageYieldLedgerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FounderMetricsRequest = {
  genesises?: string[];
  wallet?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FounderMetricsRequest;
    const wallet = (body.wallet || "").toLowerCase();
    const inputGenesises = Array.isArray(body.genesises) ? body.genesises : [];

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json(
        { error: "wallet is required and must be a valid address" },
        { status: 400 }
      );
    }

    const genesises = [...new Set(inputGenesises.map((g) => g.toLowerCase()))].filter(
      (g): g is Address => isAddress(g)
    );

    if (genesises.length === 0) {
      return NextResponse.json({ paidByGenesis: {} });
    }

    const store = getMaidenVoyageYieldLedgerStore();
    const pairs = await Promise.all(
      genesises.map(async (genesis) => {
        const ledger = await store.getLedger(genesis);
        const paid = Number.parseFloat(ledger.paidByWallet[wallet] || "0");
        return [genesis, Number.isFinite(paid) ? paid : 0] as const;
      })
    );

    const paidByGenesis = Object.fromEntries(pairs);
    return NextResponse.json({ paidByGenesis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json(
      { error: `Unable to load founder metrics: ${message}` },
      { status: 500 }
    );
  }
}

