import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Very small in-memory cache (per server instance) to reduce CoinGecko 429s.
// Keys are the raw `ids` query string (comma-separated, unsorted).
type CacheEntry = { timestampMs: number; data: unknown };
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_KEYS = 50;

function getCache(): Map<string, CacheEntry> {
  const g = globalThis as unknown as { __harborCgCache?: Map<string, CacheEntry> };
  if (!g.__harborCgCache) g.__harborCgCache = new Map();
  return g.__harborCgCache;
}

function trimCache(cache: Map<string, CacheEntry>) {
  if (cache.size <= MAX_CACHE_KEYS) return;
  // Drop oldest entries first.
  const entries = Array.from(cache.entries()).sort(
    (a, b) => a[1].timestampMs - b[1].timestampMs
  );
  const toDelete = entries.slice(0, cache.size - MAX_CACHE_KEYS);
  toDelete.forEach(([k]) => cache.delete(k));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsRaw = (url.searchParams.get("ids") || "").trim();

  if (!idsRaw) {
    return NextResponse.json(
      { error: "Missing required query param: ids" },
      { status: 400 }
    );
  }

  const cache = getCache();
  const cached = cache.get(idsRaw);
  const now = Date.now();
  if (cached && now - cached.timestampMs < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        // Allow browser caching too; this endpoint is safe to cache.
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      },
    });
  }

  // NOTE: CoinGecko aggressively rate limits browser traffic + can block with CORS.
  // We fetch server-side to avoid CORS and to centralize rate limiting.
  const upstreamUrl = new URL("https://api.coingecko.com/api/v3/simple/price");
  upstreamUrl.searchParams.set("ids", idsRaw);
  upstreamUrl.searchParams.set("vs_currencies", "usd");

  const res = await fetch(upstreamUrl.toString(), {
    // Route handlers are dynamic by default; use a short revalidate window.
    next: { revalidate: 30 },
    headers: {
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: `CoinGecko error: ${res.status}`, upstreamBody: text },
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "CoinGecko returned invalid JSON" },
      { status: 502 }
    );
  }

  cache.set(idsRaw, { timestampMs: now, data });
  trimCache(cache);

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
    },
  });
}


