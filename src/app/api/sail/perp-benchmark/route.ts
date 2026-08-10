import { NextResponse } from "next/server";
import { getArchiveMainnetRpcClient } from "@/config/rpc";
import {
  buildSailPerpBenchmark,
  type SailPerpBenchmarkApiResponse,
} from "@/lib/sailPerpBenchmarkServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RANGE_SECONDS = 366 * 24 * 60 * 60;
const CACHE_TTL_MS = 15 * 60 * 1_000;

type CacheEntry = {
  createdAt: number;
  data: SailPerpBenchmarkApiResponse;
};

function cache(): Map<string, CacheEntry> {
  const globalCache = globalThis as typeof globalThis & {
    __sailPerpBenchmarkCache?: Map<string, CacheEntry>;
  };
  if (!globalCache.__sailPerpBenchmarkCache) {
    globalCache.__sailPerpBenchmarkCache = new Map();
  }
  return globalCache.__sailPerpBenchmarkCache;
}

function inFlight(): Map<string, Promise<SailPerpBenchmarkApiResponse>> {
  const globalCache = globalThis as typeof globalThis & {
    __sailPerpBenchmarkInFlight?: Map<
      string,
      Promise<SailPerpBenchmarkApiResponse>
    >;
  };
  if (!globalCache.__sailPerpBenchmarkInFlight) {
    globalCache.__sailPerpBenchmarkInFlight = new Map();
  }
  return globalCache.__sailPerpBenchmarkInFlight;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const marketId = params.get("marketId")?.trim() ?? "";
  const start = Number(params.get("start"));
  const end = Number(params.get("end"));

  if (
    !marketId ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start <= 0 ||
    end <= start
  ) {
    return NextResponse.json(
      { error: "marketId, start, and end are required" },
      { status: 400 },
    );
  }
  if (end - start > MAX_RANGE_SECONDS) {
    return NextResponse.json(
      { error: "Benchmark range cannot exceed 366 days" },
      { status: 400 },
    );
  }

  const normalizedStart = Math.floor(start / 3_600) * 3_600;
  const normalizedEnd = Math.floor(end / 3_600) * 3_600;
  if (normalizedEnd <= normalizedStart) {
    return NextResponse.json(
      { error: "Benchmark range must span at least one hour" },
      { status: 400 },
    );
  }
  const key = `${marketId}:${normalizedStart}:${normalizedEnd}`;
  const cached = cache().get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  }

  try {
    let pending = inFlight().get(key);
    if (!pending) {
      pending = buildSailPerpBenchmark(
        getArchiveMainnetRpcClient(),
        marketId,
        normalizedStart,
        normalizedEnd,
      );
      inFlight().set(key, pending);
    }
    const data = await pending;
    inFlight().delete(key);
    cache().set(key, { createdAt: Date.now(), data });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    inFlight().delete(key);
    const message =
      error instanceof Error ? error.message : "Benchmark generation failed";
    const unsupported =
      message.includes("no supported") || message.includes("Not enough");
    console.error("[api/sail/perp-benchmark]", message);
    return NextResponse.json(
      { error: message },
      { status: unsupported ? 422 : 502 },
    );
  }
}
