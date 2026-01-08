import { type Address, isAddress } from "viem";

export type FeedId = string; // `${network}:${priceFeedAddress}`

export type VoteTotalsResponse = {
  totals: Record<FeedId, number>;
  allocations?: Record<FeedId, number>;
};

export type VotesStore = {
  getNonce(voter: Address): Promise<string>;
  consumeNonce(voter: Address, nonce: string): Promise<boolean>;

  getTotals(feedIds: FeedId[]): Promise<Record<FeedId, number>>;
  getAllocations(voter: Address): Promise<Record<FeedId, number>>;
  setAllocations(
    voter: Address,
    next: Record<FeedId, number>
  ): Promise<{ totals: Record<FeedId, number>; allocations: Record<FeedId, number> }>;
};

const TOTALS_KEY = "harbor:votes:totals";
const ALLOC_KEY_PREFIX = "harbor:votes:alloc:";
const NONCE_KEY_PREFIX = "harbor:votes:nonce:";

function normalizeAllocations(input: Record<FeedId, number>): Record<FeedId, number> {
  const out: Record<FeedId, number> = {};
  for (const [k, v] of Object.entries(input || {})) {
    const points = Number(v);
    if (!Number.isFinite(points)) continue;
    const rounded = Math.floor(points);
    if (rounded <= 0) continue;
    if (rounded > 5) out[k] = 5;
    else out[k] = rounded;
  }
  return out;
}

function sumPoints(map: Record<FeedId, number>): number {
  return Object.values(map).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}

async function upstashCommand<T = any>(cmd: any[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Votes storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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
  const json = (await res.json()) as any;
  // Upstash returns { result: ... }
  return json?.result as T;
}

function createMemoryStore(): VotesStore {
  const totals = new Map<FeedId, number>();
  const allocationsByVoter = new Map<string, Map<FeedId, number>>();
  const nonces = new Map<string, { nonce: string; expiresAt: number }>();

  const nonceTtlMs = 10 * 60 * 1000;

  return {
    async getNonce(voter) {
      const key = voter.toLowerCase();
      const now = Date.now();
      const existing = nonces.get(key);
      if (existing && existing.expiresAt > now) return existing.nonce;
      const nonce = crypto.randomUUID();
      nonces.set(key, { nonce, expiresAt: now + nonceTtlMs });
      return nonce;
    },
    async consumeNonce(voter, nonce) {
      const key = voter.toLowerCase();
      const now = Date.now();
      const existing = nonces.get(key);
      if (!existing || existing.expiresAt <= now) return false;
      if (existing.nonce !== nonce) return false;
      nonces.delete(key);
      return true;
    },
    async getTotals(feedIds) {
      const out: Record<FeedId, number> = {};
      for (const id of feedIds) out[id] = totals.get(id) ?? 0;
      return out;
    },
    async getAllocations(voter) {
      const map = allocationsByVoter.get(voter.toLowerCase());
      const out: Record<FeedId, number> = {};
      if (!map) return out;
      for (const [k, v] of map.entries()) out[k] = v;
      return out;
    },
    async setAllocations(voter, next) {
      const vkey = voter.toLowerCase();
      const prevMap = allocationsByVoter.get(vkey) ?? new Map<FeedId, number>();
      const nextNorm = normalizeAllocations(next);
      const nextSum = sumPoints(nextNorm);
      if (nextSum > 5) {
        throw new Error("Total vote points cannot exceed 5.");
      }

      const allFeedIds = new Set<FeedId>([...prevMap.keys(), ...Object.keys(nextNorm)]);
      for (const feedId of allFeedIds) {
        const prev = prevMap.get(feedId) ?? 0;
        const nxt = nextNorm[feedId] ?? 0;
        const delta = nxt - prev;
        if (delta !== 0) {
          totals.set(feedId, (totals.get(feedId) ?? 0) + delta);
        }
        if (nxt <= 0) prevMap.delete(feedId);
        else prevMap.set(feedId, nxt);
      }
      allocationsByVoter.set(vkey, prevMap);

      const outAlloc: Record<FeedId, number> = {};
      for (const [k, v] of prevMap.entries()) outAlloc[k] = v;
      const outTotals: Record<FeedId, number> = {};
      for (const [k, v] of totals.entries()) outTotals[k] = v;
      return { totals: outTotals, allocations: outAlloc };
    },
  };
}

function createUpstashStore(): VotesStore {
  const nonceTtlSeconds = 10 * 60;

  return {
    async getNonce(voter) {
      const key = `${NONCE_KEY_PREFIX}${voter.toLowerCase()}`;
      const existing = await upstashCommand<string | null>(["GET", key]);
      if (existing) return existing;
      const nonce = crypto.randomUUID();
      await upstashCommand(["SET", key, nonce, "EX", `${nonceTtlSeconds}`]);
      return nonce;
    },

    async consumeNonce(voter, nonce) {
      const key = `${NONCE_KEY_PREFIX}${voter.toLowerCase()}`;
      const existing = await upstashCommand<string | null>(["GET", key]);
      if (!existing || existing !== nonce) return false;
      await upstashCommand(["DEL", key]);
      return true;
    },

    async getTotals(feedIds) {
      if (feedIds.length === 0) return {};
      // HMGET totals hash
      const result = await upstashCommand<(string | null)[]>(["HMGET", TOTALS_KEY, ...feedIds]);
      const out: Record<FeedId, number> = {};
      for (let i = 0; i < feedIds.length; i++) {
        out[feedIds[i]] = result?.[i] ? Number(result[i]) : 0;
      }
      return out;
    },

    async getAllocations(voter) {
      const key = `${ALLOC_KEY_PREFIX}${voter.toLowerCase()}`;
      const res = await upstashCommand<Record<string, string> | null>(["HGETALL", key]);
      const out: Record<FeedId, number> = {};
      if (!res) return out;
      for (const [k, v] of Object.entries(res)) {
        const n = Number(v);
        if (!Number.isFinite(n)) continue;
        out[k] = n;
      }
      return out;
    },

    async setAllocations(voter, next) {
      const v = voter.toLowerCase();
      const allocKey = `${ALLOC_KEY_PREFIX}${v}`;
      const prev = await this.getAllocations(voter);
      const nextNorm = normalizeAllocations(next);
      const nextSum = sumPoints(nextNorm);
      if (nextSum > 5) {
        throw new Error("Total vote points cannot exceed 5.");
      }

      const allFeedIds = new Set<FeedId>([...Object.keys(prev), ...Object.keys(nextNorm)]);
      for (const feedId of allFeedIds) {
        const prevPts = prev[feedId] ?? 0;
        const nextPts = nextNorm[feedId] ?? 0;
        const delta = nextPts - prevPts;
        if (delta !== 0) {
          await upstashCommand(["HINCRBY", TOTALS_KEY, feedId, `${delta}`]);
        }
        if (nextPts <= 0) {
          await upstashCommand(["HDEL", allocKey, feedId]);
        } else {
          await upstashCommand(["HSET", allocKey, feedId, `${nextPts}`]);
        }
      }

      // return fresh totals/allocations for these feed ids
      const totals = await this.getTotals(Array.from(allFeedIds));
      const allocations = await this.getAllocations(voter);
      return { totals, allocations };
    },
  };
}

export function getVotesStore(): VotesStore {
  const mode = process.env.VOTES_STORE || "upstash";
  if (mode === "memory") {
    return createMemoryStore();
  }

  // Upstash default; allow dev to run without env by falling back to memory
  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!hasUpstash) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[votes] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory votes store (dev only)."
      );
      return createMemoryStore();
    }
    throw new Error(
      "Votes storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashStore();
}

export function buildFeedId(network: string, address: string): FeedId {
  const net = (network || "").toLowerCase();
  if (!isAddress(address)) {
    throw new Error(`Invalid feed address: ${address}`);
  }
  return `${net}:${address.toLowerCase()}`;
}


