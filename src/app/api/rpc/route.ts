import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * JSON-RPC proxy for Ethereum mainnet and MegaETH (chainId 4326).
 * Keeps provider API keys server-side only.
 * Client sends POST to `/api/rpc` (mainnet) or `/api/rpc?chain=megaeth` (MegaETH);
 * we forward to `MAINNET_RPC_URL` / `MEGAETH_RPC_URL` environment variables (+ optional fallbacks).
 */
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const MAINNET_RPC_FALLBACK_URLS = (process.env.MAINNET_RPC_FALLBACK_URLS || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

/** MegaETH (chainId 4326) upstream — server-only; never `NEXT_PUBLIC_`. */
const MEGAETH_RPC_URL = process.env.MEGAETH_RPC_URL;
const MEGAETH_RPC_FALLBACK_URLS = (process.env.MEGAETH_RPC_FALLBACK_URLS || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

/** Max JSON-RPC body size (single or batch) to limit abuse. */
const MAX_RPC_BODY_BYTES = 512 * 1024;

const RPC_BASE_ALLOWLIST = new Set([
  "https://harborfinance.io",
  "https://www.harborfinance.io",
  "https://app.harborfinance.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
]);

function extraRpcAllowedOrigins(): Set<string> {
  const raw = process.env.RPC_ALLOWED_ORIGINS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Vercel previews and custom deploy hosts: allow when `Origin` matches this request's `Host`. */
function originMatchesHost(request: Request, origin: string): boolean {
  const host = (request.headers.get("host") || "").trim().toLowerCase();
  if (!host) return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

/**
 * CORS allowlist: do not echo arbitrary `Origin` (avoids reflecting untrusted origins).
 * Missing `Origin` is allowed (curl, server-side); present-but-disallowed is rejected on POST.
 */
function getAllowedRpcOrigin(request: Request): string | undefined {
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  if (RPC_BASE_ALLOWLIST.has(origin)) return origin;
  if (extraRpcAllowedOrigins().has(origin)) return origin;
  if (originMatchesHost(request, origin)) return origin;
  return undefined;
}

function getMainnetUpstreamUrls(): string[] {
  return [MAINNET_RPC_URL, ...MAINNET_RPC_FALLBACK_URLS].filter(
    (url): url is string => Boolean(url)
  );
}

function getMegaethUpstreamUrls(): string[] {
  return [MEGAETH_RPC_URL, ...MEGAETH_RPC_FALLBACK_URLS].filter(
    (url): url is string => Boolean(url)
  );
}

/** Resolve which upstream list to use from `?chain=` (default: Ethereum mainnet). */
function getUpstreamUrlsForRequest(request: Request): {
  upstreamUrls: string[];
  chainLabel: string;
} {
  let chain: string | null = null;
  try {
    chain = new URL(request.url).searchParams.get("chain");
  } catch {
    chain = null;
  }
  const c = (chain || "").toLowerCase().trim();
  if (c === "megaeth" || c === "4326") {
    return { upstreamUrls: getMegaethUpstreamUrls(), chainLabel: "megaeth" };
  }
  if (
    c === "" ||
    c === "mainnet" ||
    c === "ethereum" ||
    c === "eth" ||
    c === "1"
  ) {
    return { upstreamUrls: getMainnetUpstreamUrls(), chainLabel: "mainnet" };
  }
  return { upstreamUrls: [], chainLabel: "unknown" };
}

function shouldRetryWithFallback(status: number): boolean {
  return status === 429 || status >= 500;
}

function corsHeaders(request: Request): Record<string, string> {
  const allowed = getAllowedRpcOrigin(request);
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allowed) {
    base["Access-Control-Allow-Origin"] = allowed;
  }
  return base;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "Content-Length": "0",
    },
  });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const { upstreamUrls, chainLabel } = getUpstreamUrlsForRequest(request);

  const origin = request.headers.get("origin");
  if (origin && !getAllowedRpcOrigin(request)) {
    return NextResponse.json(
      {
        error: "Forbidden",
        jsonrpc: "2.0",
        id: null,
      },
      { status: 403, headers }
    );
  }

  if (chainLabel === "unknown") {
    return NextResponse.json(
      {
        error:
          "Unknown chain for RPC proxy. Use ?chain=mainnet (default) or ?chain=megaeth",
        jsonrpc: "2.0",
        id: null,
      },
      { status: 400, headers }
    );
  }

  if (!upstreamUrls.length) {
    const detail =
      chainLabel === "megaeth"
        ? "MEGAETH_RPC_URL missing (and no MEGAETH_RPC_FALLBACK_URLS)"
        : "MAINNET_RPC_URL missing (and no MAINNET_RPC_FALLBACK_URLS)";
    return NextResponse.json(
      {
        error: `RPC proxy not configured (${detail})`,
      },
      { status: 503, headers }
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength)) {
    const n = Number(contentLength);
    if (n > MAX_RPC_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large", jsonrpc: "2.0", id: null },
        { status: 413, headers }
      );
    }
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_RPC_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large", jsonrpc: "2.0", id: null },
        { status: 413, headers }
      );
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", jsonrpc: "2.0", id: null },
      { status: 400, headers }
    );
  }

  // Accept single object or batch array
  const isBatch = Array.isArray(body);
  const payload = isBatch ? body : [body];

  if (!payload.length) {
    return NextResponse.json(
      { error: "Empty request", jsonrpc: "2.0", id: null },
      { status: 400, headers }
    );
  }

  const bodyToSend = isBatch ? payload : payload[0];
  const attemptErrors: string[] = [];

  for (let i = 0; i < upstreamUrls.length; i++) {
    const isLastAttempt = i === upstreamUrls.length - 1;
    const upstreamUrl = upstreamUrls[i];

    try {
      const res = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyToSend),
      });

      const text = await res.text();
      if (!res.ok) {
        const errorSummary = `attempt ${i + 1}: upstream status ${res.status}`;
        attemptErrors.push(errorSummary);

        if (!isLastAttempt && shouldRetryWithFallback(res.status)) {
          console.warn(`[api/rpc] ${errorSummary}, trying fallback`);
          continue;
        }

        return NextResponse.json(
          {
            error: `Upstream RPC error: ${res.status}`,
            details: text,
            fallbackAttempts: upstreamUrls.length,
            attemptErrors,
          },
          { status: 502, headers }
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        const errorSummary = `attempt ${i + 1}: invalid JSON from upstream`;
        attemptErrors.push(errorSummary);
        if (!isLastAttempt) {
          console.warn(`[api/rpc] ${errorSummary}, trying fallback`);
          continue;
        }
        return NextResponse.json(
          { error: "Upstream returned invalid JSON", jsonrpc: "2.0", id: null, attemptErrors },
          { status: 502, headers }
        );
      }

      return NextResponse.json(data, {
        headers: { ...headers, "Cache-Control": "no-store" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const errorSummary = `attempt ${i + 1}: ${message}`;
      attemptErrors.push(errorSummary);

      if (!isLastAttempt) {
        console.warn("[api/rpc] Proxy error, trying fallback:", message);
        continue;
      }

      // Log message only; do not log error object (may contain upstream URL in some runtimes)
      console.error("[api/rpc] Proxy error:", message);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal proxy error" },
          id: Array.isArray(body) ? body[0]?.id : (body as { id?: unknown })?.id ?? null,
          attemptErrors,
        },
        { status: 500, headers }
      );
    }
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: { code: -32603, message: "No RPC upstream available" },
      id: Array.isArray(body) ? body[0]?.id : (body as { id?: unknown })?.id ?? null,
      attemptErrors,
    },
    { status: 500, headers }
  );
}
