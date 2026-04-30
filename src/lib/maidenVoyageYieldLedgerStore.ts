import { type Address, isAddress } from "viem";

export type MaidenVoyageDistributionEvent = {
  id: string;
  createdAt: string;
  wallet: string;
  amountUSD: string;
  txHash?: string;
  notes?: string;
};

export type MaidenVoyageYieldLedger = {
  /** Cumulative USD paid per wallet (lowercase address) */
  paidByWallet: Record<string, string>;
  events: MaidenVoyageDistributionEvent[];
};

export type MaidenVoyageYieldLedgerStore = {
  getLedger(genesis: Address): Promise<MaidenVoyageYieldLedger>;
  recordDistributions(
    genesis: Address,
    entries: Array<{
      wallet: Address;
      amountUSD: number;
      txHash?: string;
      notes?: string;
    }>
  ): Promise<MaidenVoyageYieldLedger>;
};

const PAID_HASH_PREFIX = "harbor:mv-yield:paid:";
const EVENTS_LIST_PREFIX = "harbor:mv-yield:events:";

function genesisKey(g: Address): string {
  return g.toLowerCase();
}

async function upstashCommand<T = unknown>(cmd: unknown[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Maiden voyage yield ledger storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash error (${res.status}): ${text || res.statusText}`);
  }
  const json = (await res.json()) as { result?: T };
  return json?.result as T;
}

function createMemoryStore(): MaidenVoyageYieldLedgerStore {
  const paid = new Map<string, Map<string, number>>();
  const events = new Map<string, MaidenVoyageDistributionEvent[]>();

  function getMaps(g: string) {
    let p = paid.get(g);
    if (!p) {
      p = new Map();
      paid.set(g, p);
    }
    let e = events.get(g);
    if (!e) {
      e = [];
      events.set(g, e);
    }
    return { p, e: e };
  }

  return {
    async getLedger(genesis) {
      const g = genesisKey(genesis);
      const { p, e } = getMaps(g);
      const paidByWallet: Record<string, string> = {};
      for (const [w, v] of p.entries()) {
        paidByWallet[w] = String(v);
      }
      return { paidByWallet, events: [...e] };
    },
    async recordDistributions(genesis, entries) {
      const g = genesisKey(genesis);
      const { p, e } = getMaps(g);
      const now = new Date().toISOString();
      for (const row of entries) {
        const w = row.wallet.toLowerCase();
        const prev = p.get(w) ?? 0;
        p.set(w, prev + row.amountUSD);
        e.unshift({
          id: `${now}-${w}-${crypto.randomUUID()}`,
          createdAt: now,
          wallet: w,
          amountUSD: String(row.amountUSD),
          txHash: row.txHash,
          notes: row.notes,
        });
      }
      const paidByWallet: Record<string, string> = {};
      for (const [w, v] of p.entries()) {
        paidByWallet[w] = String(v);
      }
      return { paidByWallet, events: [...e] };
    },
  };
}

function createUpstashStore(): MaidenVoyageYieldLedgerStore {
  const store: MaidenVoyageYieldLedgerStore = {
    async getLedger(genesis) {
      const g = genesisKey(genesis);
      const paidKey = `${PAID_HASH_PREFIX}${g}`;
      const eventsKey = `${EVENTS_LIST_PREFIX}${g}`;
      const raw = await upstashCommand<
        Record<string, string> | string[] | null
      >(["HGETALL", paidKey]);
      const paidByWallet: Record<string, string> = {};
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) paidByWallet[k.toLowerCase()] = String(v);
        }
      } else if (Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i += 2) {
          const k = raw[i] as string;
          const v = raw[i + 1] as string;
          if (k && v != null) paidByWallet[k.toLowerCase()] = String(v);
        }
      }
      const evLines = await upstashCommand<string[]>([
        "LRANGE",
        eventsKey,
        "0",
        "499",
      ]);
      const events: MaidenVoyageDistributionEvent[] = [];
      for (const line of evLines || []) {
        try {
          events.push(JSON.parse(line) as MaidenVoyageDistributionEvent);
        } catch {
          /* skip corrupt */
        }
      }
      return { paidByWallet, events };
    },
    async recordDistributions(genesis, entries) {
      const g = genesisKey(genesis);
      const paidKey = `${PAID_HASH_PREFIX}${g}`;
      const eventsKey = `${EVENTS_LIST_PREFIX}${g}`;
      const now = new Date().toISOString();
      for (const row of entries) {
        if (!isAddress(row.wallet)) continue;
        const w = row.wallet.toLowerCase();
        await upstashCommand([
          "HINCRBYFLOAT",
          paidKey,
          w,
          String(row.amountUSD),
        ]);
        const ev: MaidenVoyageDistributionEvent = {
          id: `${now}-${w}-${crypto.randomUUID()}`,
          createdAt: now,
          wallet: w,
          amountUSD: String(row.amountUSD),
          txHash: row.txHash,
          notes: row.notes,
        };
        await upstashCommand(["LPUSH", eventsKey, JSON.stringify(ev)]);
      }
      return store.getLedger(genesis);
    },
  };
  return store;
}

export function getMaidenVoyageYieldLedgerStore(): MaidenVoyageYieldLedgerStore {
  const mode = process.env.MAIDEN_VYIELD_STORE || process.env.VOTES_STORE || "upstash";
  if (mode === "memory") {
    return createMemoryStore();
  }
  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!hasUpstash) {
    const vercelEnv = process.env.VERCEL_ENV;
    const allowMemoryFallback =
      process.env.NODE_ENV === "development" ||
      (vercelEnv && vercelEnv !== "production");
    if (allowMemoryFallback) {
      console.warn(
        `[maidenVoyageYield] Upstash missing; using in-memory ledger (${vercelEnv || process.env.NODE_ENV}).`
      );
      return createMemoryStore();
    }
    throw new Error(
      "Maiden voyage yield ledger requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production."
    );
  }
  return createUpstashStore();
}
