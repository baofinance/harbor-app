import { type Address } from "viem";

export type RebateStatus = {
  user: Address;
  usedCount: number;
  totalUsdE18: bigint;
  totalEthWei: bigint;
  lastUpdatedAt: number;
};

export type ReferrerTotals = {
  referrer: Address;
  feeUsdE18: bigint;
  feeEthWei: bigint;
  yieldUsdE18: bigint;
  yieldEthWei: bigint;
  marksPoints: bigint;
  lastUpdatedAt: number;
};

export type ReferralEarningsStore = {
  getRebateStatus(user: Address): Promise<RebateStatus | null>;
  setRebateStatus(status: RebateStatus): Promise<void>;
  getReferrerTotals(referrer: Address): Promise<ReferrerTotals | null>;
  setReferrerTotals(totals: ReferrerTotals): Promise<void>;
  checkAndMarkFeeSeen(id: string): Promise<boolean>;
  listReferrers(): Promise<Address[]>;
  listRebateUsers(): Promise<Address[]>;
};

const REBATE_PREFIX = "harbor:ref:rebate:";
const REFERRER_PREFIX = "harbor:ref:referrer:";
const FEE_SEEN_PREFIX = "harbor:ref:fee:seen:";
const REFERRER_SET = "harbor:ref:referrers";
const REBATE_SET = "harbor:ref:rebate:users";

function serializeRebate(status: RebateStatus): string {
  return JSON.stringify({
    ...status,
    totalUsdE18: status.totalUsdE18.toString(),
    totalEthWei: status.totalEthWei.toString(),
  });
}

function deserializeRebate(raw: string): RebateStatus {
  const parsed = JSON.parse(raw) as any;
  return {
    user: parsed.user,
    usedCount: Number(parsed.usedCount || 0),
    totalUsdE18: BigInt(parsed.totalUsdE18 || 0),
    totalEthWei: BigInt(parsed.totalEthWei || 0),
    lastUpdatedAt: Number(parsed.lastUpdatedAt || 0),
  };
}

function serializeTotals(totals: ReferrerTotals): string {
  return JSON.stringify({
    ...totals,
    feeUsdE18: totals.feeUsdE18.toString(),
    feeEthWei: totals.feeEthWei.toString(),
    yieldUsdE18: totals.yieldUsdE18.toString(),
    yieldEthWei: totals.yieldEthWei.toString(),
    marksPoints: totals.marksPoints.toString(),
  });
}

function deserializeTotals(raw: string): ReferrerTotals {
  const parsed = JSON.parse(raw) as any;
  return {
    referrer: parsed.referrer,
    feeUsdE18: BigInt(parsed.feeUsdE18 || 0),
    feeEthWei: BigInt(parsed.feeEthWei || 0),
    yieldUsdE18: BigInt(parsed.yieldUsdE18 || 0),
    yieldEthWei: BigInt(parsed.yieldEthWei || 0),
    marksPoints: BigInt(parsed.marksPoints || 0),
    lastUpdatedAt: Number(parsed.lastUpdatedAt || 0),
  };
}

async function upstashCommand<T = any>(cmd: any[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Referral earnings storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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

function createMemoryStore(): ReferralEarningsStore {
  const rebates = new Map<string, RebateStatus>();
  const referrers = new Map<string, ReferrerTotals>();
  const feeSeen = new Set<string>();
  const referrerSet = new Set<string>();
  const rebateSet = new Set<string>();

  return {
    async getRebateStatus(user) {
      return rebates.get(user.toLowerCase()) || null;
    },
    async setRebateStatus(status) {
      rebates.set(status.user.toLowerCase(), status);
      rebateSet.add(status.user.toLowerCase());
    },
    async getReferrerTotals(referrer) {
      return referrers.get(referrer.toLowerCase()) || null;
    },
    async setReferrerTotals(totals) {
      referrers.set(totals.referrer.toLowerCase(), totals);
      referrerSet.add(totals.referrer.toLowerCase());
    },
    async checkAndMarkFeeSeen(id) {
      if (feeSeen.has(id)) return false;
      feeSeen.add(id);
      return true;
    },
    async listReferrers() {
      return Array.from(referrerSet.values()) as Address[];
    },
    async listRebateUsers() {
      return Array.from(rebateSet.values()) as Address[];
    },
  };
}

function createUpstashStore(): ReferralEarningsStore {
  return {
    async getRebateStatus(user) {
      const raw = await upstashCommand<string | null>([
        "GET",
        `${REBATE_PREFIX}${user.toLowerCase()}`,
      ]);
      if (!raw) return null;
      return deserializeRebate(raw);
    },
    async setRebateStatus(status) {
      await upstashCommand([
        "SET",
        `${REBATE_PREFIX}${status.user.toLowerCase()}`,
        serializeRebate(status),
      ]);
      await upstashCommand(["SADD", REBATE_SET, status.user.toLowerCase()]);
    },
    async getReferrerTotals(referrer) {
      const raw = await upstashCommand<string | null>([
        "GET",
        `${REFERRER_PREFIX}${referrer.toLowerCase()}`,
      ]);
      if (!raw) return null;
      return deserializeTotals(raw);
    },
    async setReferrerTotals(totals) {
      await upstashCommand([
        "SET",
        `${REFERRER_PREFIX}${totals.referrer.toLowerCase()}`,
        serializeTotals(totals),
      ]);
      await upstashCommand(["SADD", REFERRER_SET, totals.referrer.toLowerCase()]);
    },
    async checkAndMarkFeeSeen(id) {
      const key = `${FEE_SEEN_PREFIX}${id}`;
      const result = await upstashCommand<string | null>([
        "SET",
        key,
        "1",
        "NX",
      ]);
      return result === "OK";
    },
    async listReferrers() {
      const list = await upstashCommand<string[] | null>(["SMEMBERS", REFERRER_SET]);
      return (list || []) as Address[];
    },
    async listRebateUsers() {
      const list = await upstashCommand<string[] | null>(["SMEMBERS", REBATE_SET]);
      return (list || []) as Address[];
    },
  };
}

export function getReferralEarningsStore(): ReferralEarningsStore {
  const mode = process.env.REFERRAL_EARNINGS_STORE || "upstash";
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
        `[referrals-earnings] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory earnings store (non-production env: ${
          vercelEnv || process.env.NODE_ENV
        }).`
      );
      return createMemoryStore();
    }
    throw new Error(
      "Referral earnings storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashStore();
}
