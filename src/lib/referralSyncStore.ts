export type ReferralCursorStore = {
  getCursor(key: string): Promise<string | null>;
  setCursor(key: string, value: string): Promise<void>;
};

export type ReferralMetaStore = {
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
};

const CURSOR_PREFIX = "harbor:ref:cursor:";
const META_PREFIX = "harbor:ref:meta:";

async function upstashCommand<T = any>(cmd: any[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Referral sync storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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

function createMemoryStore(): ReferralCursorStore {
  const cursors = new Map<string, string>();
  return {
    async getCursor(key) {
      return cursors.get(key) ?? null;
    },
    async setCursor(key, value) {
      cursors.set(key, value);
    },
  };
}

function createUpstashStore(): ReferralCursorStore {
  return {
    async getCursor(key) {
      return (
        (await upstashCommand<string | null>([
          "GET",
          `${CURSOR_PREFIX}${key}`,
        ])) || null
      );
    },
    async setCursor(key, value) {
      await upstashCommand(["SET", `${CURSOR_PREFIX}${key}`, value]);
    },
  };
}

export function getReferralSyncStore(): ReferralCursorStore {
  const mode = process.env.REFERRAL_SYNC_STORE || "upstash";
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
        `[referrals-sync] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory cursor store (non-production env: ${
          vercelEnv || process.env.NODE_ENV
        }).`
      );
      return createMemoryStore();
    }
    throw new Error(
      "Referral sync storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashStore();
}

function createMemoryMetaStore(): ReferralMetaStore {
  const meta = new Map<string, string>();
  return {
    async getMeta(key) {
      return meta.get(key) ?? null;
    },
    async setMeta(key, value) {
      meta.set(key, value);
    },
  };
}

function createUpstashMetaStore(): ReferralMetaStore {
  return {
    async getMeta(key) {
      return (
        (await upstashCommand<string | null>([
          "GET",
          `${META_PREFIX}${key}`,
        ])) || null
      );
    },
    async setMeta(key, value) {
      await upstashCommand(["SET", `${META_PREFIX}${key}`, value]);
    },
  };
}

export function getReferralMetaStore(): ReferralMetaStore {
  const mode = process.env.REFERRAL_SYNC_STORE || "upstash";
  if (mode === "memory") {
    return createMemoryMetaStore();
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
        `[referrals-meta] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory meta store (non-production env: ${
          vercelEnv || process.env.NODE_ENV
        }).`
      );
      return createMemoryMetaStore();
    }
    throw new Error(
      "Referral meta storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashMetaStore();
}
