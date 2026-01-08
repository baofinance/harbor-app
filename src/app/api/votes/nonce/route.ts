export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getVotesStore } from "@/lib/votesStore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") || "";

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const store = getVotesStore();
    const nonce = await store.getNonce(address);
    return NextResponse.json({ nonce });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to get nonce" },
      { status: 500 }
    );
  }
}


