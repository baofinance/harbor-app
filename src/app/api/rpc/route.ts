import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * JSON-RPC proxy for Ethereum mainnet.
 * Keeps the Alchemy (or other provider) API key server-side only.
 * Client sends requests here; we forward to MAINNET_RPC_URL (no NEXT_PUBLIC_).
 */
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;

export async function POST(request: Request) {
  if (!MAINNET_RPC_URL) {
    return NextResponse.json(
      { error: "RPC proxy not configured (MAINNET_RPC_URL missing)" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", jsonrpc: "2.0", id: null },
      { status: 400 }
    );
  }

  // Accept single object or batch array
  const isBatch = Array.isArray(body);
  const payload = isBatch ? body : [body];

  if (!payload.length) {
    return NextResponse.json(
      { error: "Empty request", jsonrpc: "2.0", id: null },
      { status: 400 }
    );
  }

  try {
    const bodyToSend = isBatch ? payload : payload[0];
    const res = await fetch(MAINNET_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyToSend),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream RPC error: ${res.status}`, details: text },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Upstream returned invalid JSON", jsonrpc: "2.0", id: null },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // Log message only; do not log error object (may contain upstream URL in some runtimes)
    console.error("[api/rpc] Proxy error:", e instanceof Error ? e.message : "Unknown error");
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal proxy error" },
        id: Array.isArray(body) ? body[0]?.id : (body as { id?: unknown })?.id ?? null,
      },
      { status: 500 }
    );
  }
}
