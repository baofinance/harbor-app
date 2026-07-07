import { NextResponse } from "next/server";
import { getRpcClient } from "@/config/rpc";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import {
  fetchTidePolV4Snapshot,
  type TidePolV4Snapshot,
} from "@/lib/tidePolV4Server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 60_000;

type CacheEntry = { timestampMs: number; data: TidePolV4Snapshot | null };

function getCache(): CacheEntry | undefined {
  const g = globalThis as unknown as { __tidePolV4Cache?: CacheEntry };
  return g.__tidePolV4Cache;
}

function setCache(entry: CacheEntry) {
  const g = globalThis as unknown as { __tidePolV4Cache?: CacheEntry };
  g.__tidePolV4Cache = entry;
}

export async function GET() {
  if (!TIDE_FLYWHEEL_CONFIG.polV4) {
    return NextResponse.json(
      { error: "POL v4 not configured" },
      { status: 503 },
    );
  }

  const cached = getCache();
  if (cached && Date.now() - cached.timestampMs < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  try {
    const client = getRpcClient();
    const snapshot = await fetchTidePolV4Snapshot(client);
    setCache({ timestampMs: Date.now(), data: snapshot });
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "POL fetch failed";
    console.error("[api/tide/pol-ownership]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
