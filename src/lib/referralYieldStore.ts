import { type YieldAccrual, type YieldPosition, type YieldToken } from "@/lib/referralYield";
import { type Address, isAddress } from "viem";

export type YieldTotals = {
  user: Address;
  token: YieldToken;
  totalBase: bigint;
  lastUpdatedAt: number;
};

export type ReferralYieldStore = {
  getPosition(user: Address, token: YieldToken): Promise<YieldPosition | null>;
  setPosition(position: YieldPosition): Promise<void>;
  getTotals(user: Address, token: YieldToken): Promise<YieldTotals | null>;
  addAccrual(accrual: YieldAccrual): Promise<void>;
};

const POSITION_PREFIX = "harbor:ref:yield:pos:";
const TOTALS_PREFIX = "harbor:ref:yield:totals:";

function toKey(user: Address, token: YieldToken): string {
  return `${user.toLowerCase()}:${token}`;
}

function serializePosition(position: YieldPosition): string {
  return JSON.stringify({
    ...position,
    wrappedBalance: position.wrappedBalance.toString(),
    lastRate: position.lastRate.toString(),
    lastBaseValue: position.lastBaseValue.toString(),
    lastUpdatedBlock: position.lastUpdatedBlock.toString(),
  });
}

function deserializePosition(raw: string): YieldPosition {
  const parsed = JSON.parse(raw) as any;
  return {
    user: parsed.user,
    token: parsed.token,
    wrappedBalance: BigInt(parsed.wrappedBalance),
    lastRate: BigInt(parsed.lastRate),
    lastBaseValue: BigInt(parsed.lastBaseValue),
    lastUpdatedBlock: BigInt(parsed.lastUpdatedBlock),
    lastUpdatedAt: Number(parsed.lastUpdatedAt),
  };
}

function serializeTotals(totals: YieldTotals): string {
  return JSON.stringify({
    ...totals,
    totalBase: totals.totalBase.toString(),
  });
}

function deserializeTotals(raw: string): YieldTotals {
  const parsed = JSON.parse(raw) as any;
  return {
    user: parsed.user,
    token: parsed.token,
    totalBase: BigInt(parsed.totalBase),
    lastUpdatedAt: Number(parsed.lastUpdatedAt),
  };
}

async function upstashCommand<T = any>(cmd: any[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Yield storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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
  return json?.result as T;
}

function createMemoryStore(): ReferralYieldStore {
  const positions = new Map<string, YieldPosition>();
  const totals = new Map<string, YieldTotals>();

  return {
    async getPosition(user, token) {
      return positions.get(toKey(user, token)) || null;
    },
    async setPosition(position) {
      positions.set(toKey(position.user, position.token), position);
    },
    async getTotals(user, token) {
      return totals.get(toKey(user, token)) || null;
    },
    async addAccrual(accrual) {
      const key = toKey(accrual.user, accrual.token);
      const existing = totals.get(key);
      const next: YieldTotals = {
        user: accrual.user,
        token: accrual.token,
        totalBase: (existing?.totalBase ?? 0n) + accrual.deltaBase,
        lastUpdatedAt: accrual.timestamp,
      };
      totals.set(key, next);
    },
  };
}

function createUpstashStore(): ReferralYieldStore {
  return {
    async getPosition(user, token) {
      const raw = await upstashCommand<string | null>([
        "GET",
        `${POSITION_PREFIX}${toKey(user, token)}`,
      ]);
      if (!raw) return null;
      return deserializePosition(raw);
    },
    async setPosition(position) {
      await upstashCommand([
        "SET",
        `${POSITION_PREFIX}${toKey(position.user, position.token)}`,
        serializePosition(position),
      ]);
    },
    async getTotals(user, token) {
      const raw = await upstashCommand<string | null>([
        "GET",
        `${TOTALS_PREFIX}${toKey(user, token)}`,
      ]);
      if (!raw) return null;
      return deserializeTotals(raw);
    },
    async addAccrual(accrual) {
      const key = `${TOTALS_PREFIX}${toKey(accrual.user, accrual.token)}`;
      const existingRaw = await upstashCommand<string | null>(["GET", key]);
      const existing = existingRaw ? deserializeTotals(existingRaw) : null;
      const next: YieldTotals = {
        user: accrual.user,
        token: accrual.token,
        totalBase: (existing?.totalBase ?? 0n) + accrual.deltaBase,
        lastUpdatedAt: accrual.timestamp,
      };
      await upstashCommand(["SET", key, serializeTotals(next)]);
    },
  };
}

export function getReferralYieldStore(): ReferralYieldStore {
  const mode = process.env.REFERRAL_YIELD_STORE || "upstash";
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
        `[referrals-yield] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory yield store (non-production env: ${
          vercelEnv || process.env.NODE_ENV
        }).`
      );
      return createMemoryStore();
    }
    throw new Error(
      "Yield storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashStore();
}

export function ensureAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error("Invalid address.");
  }
  return address as Address;
}
