import { NextResponse } from "next/server";
import { getRpcClient } from "@/config/rpc";
import {
  fetchChainlinkUsdHistory,
  isChainlinkUsdHistoryAsset,
} from "@/lib/chainlinkUsdHistory";

export const runtime = "nodejs";

/** CDN / browser cache — oracle history is append-only. */
const CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=600, max-age=60";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const asset = (searchParams.get("asset") || "").trim().toUpperCase();
  const sinceRaw = searchParams.get("since");

  if (!isChainlinkUsdHistoryAsset(asset)) {
    return NextResponse.json(
      { error: "Invalid or unsupported asset" },
      { status: 400 },
    );
  }

  let minTimestamp: number | undefined;
  if (sinceRaw != null && sinceRaw !== "") {
    const parsed = Number(sinceRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 });
    }
    minTimestamp = Math.floor(parsed);
  }

  try {
    const publicClient = getRpcClient();
    const points = await fetchChainlinkUsdHistory(
      publicClient,
      asset,
      minTimestamp,
    );

    return NextResponse.json(
      { asset, since: minTimestamp ?? null, points },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Chainlink history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
