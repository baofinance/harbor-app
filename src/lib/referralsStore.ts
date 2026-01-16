import { type Address, isAddress } from "viem";

export type ReferralCode = {
  code: string;
  referrer: Address;
  label: string;
  createdAt: number;
  active: boolean;
  usageCount: number;
};

export type ReferralBindingStatus = "pending_deposit" | "confirmed";

export type ReferralBinding = {
  referred: Address;
  referrer: Address;
  code: string;
  boundAt: number;
  status: ReferralBindingStatus;
  depositTxHash?: string;
};

export type ReferralSettings = {
  rebatePercent: number;
  rebateMaxFees: number;
  rebateMinFeeUsd: number;
  referrerFeeSharePercent: number;
  referrerMarksSharePercent: number;
  referrerYieldSharePercent: number;
  maxActiveCodes: number;
  minPayoutUsd: number;
  payoutCadence: "monthly";
  payoutCurrency: "ETH";
};

export type ReferralsStore = {
  getNonce(address: Address): Promise<string>;
  consumeNonce(address: Address, nonce: string): Promise<boolean>;
  getSettings(): Promise<ReferralSettings>;
  setSettings(settings: Partial<ReferralSettings>): Promise<ReferralSettings>;
  listCodes(referrer: Address): Promise<ReferralCode[]>;
  createCode(referrer: Address, label?: string): Promise<ReferralCode>;
  getBinding(referred: Address): Promise<ReferralBinding | null>;
  bindReferral(
    referred: Address,
    code: string,
    data?: { depositTxHash?: string }
  ): Promise<ReferralBinding>;
  confirmBinding(referred: Address, depositTxHash: string): Promise<ReferralBinding>;
};

export type ReferralsStoreMode = "memory" | "upstash";

const SETTINGS_KEY = "harbor:ref:settings";
const CODE_KEY_PREFIX = "harbor:ref:code:";
const CODES_BY_REF_PREFIX = "harbor:ref:codes:";
const BINDING_PREFIX = "harbor:ref:binding:";
const NONCE_PREFIX = "harbor:ref:nonce:";

function parseEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function defaultSettings(): ReferralSettings {
  return {
    rebatePercent: parseEnvNumber("REFERRAL_REBATE_PERCENT", 0.25),
    rebateMaxFees: parseEnvNumber("REFERRAL_REBATE_MAX_FEES", 3),
    rebateMinFeeUsd: parseEnvNumber("REFERRAL_REBATE_MIN_FEE_USD", 5),
    referrerFeeSharePercent: parseEnvNumber("REFERRAL_FEE_SHARE_PERCENT", 0.05),
    referrerMarksSharePercent: parseEnvNumber("REFERRAL_MARKS_SHARE_PERCENT", 0.05),
    referrerYieldSharePercent: parseEnvNumber("REFERRAL_YIELD_SHARE_PERCENT", 0.05),
    maxActiveCodes: parseEnvNumber("REFERRAL_MAX_ACTIVE_CODES", 10),
    minPayoutUsd: parseEnvNumber("REFERRAL_MIN_PAYOUT_USD", 100),
    payoutCadence: "monthly",
    payoutCurrency: "ETH",
  };
}

function sanitizeLabel(label?: string): string {
  const value = (label || "").trim();
  if (!value) return "";
  return value.slice(0, 64);
}

function normalizeCode(code: string): string {
  return (code || "").trim().toUpperCase();
}

function generateCode(): string {
  const bytes = crypto.randomBytes(5);
  return bytes.toString("hex").toUpperCase();
}

async function upstashCommand<T = any>(cmd: any[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Referral storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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

let memoryStore: ReferralsStore | null = null;

function createMemoryStore(): ReferralsStore {
  const nonces = new Map<string, { nonce: string; expiresAt: number }>();
  const codesByReferrer = new Map<string, Set<string>>();
  const codes = new Map<string, ReferralCode>();
  const bindings = new Map<string, ReferralBinding>();
  let settingsOverride: ReferralSettings | null = null;

  const nonceTtlMs = 10 * 60 * 1000;

  return {
    async getNonce(address) {
      const key = address.toLowerCase();
      const now = Date.now();
      const existing = nonces.get(key);
      if (existing && existing.expiresAt > now) return existing.nonce;
      const nonce = crypto.randomUUID();
      nonces.set(key, { nonce, expiresAt: now + nonceTtlMs });
      return nonce;
    },
    async consumeNonce(address, nonce) {
      const key = address.toLowerCase();
      const now = Date.now();
      const existing = nonces.get(key);
      if (!existing || existing.expiresAt <= now) return false;
      if (existing.nonce !== nonce) return false;
      nonces.delete(key);
      return true;
    },
    async getSettings() {
      return settingsOverride || defaultSettings();
    },
    async setSettings(settings) {
      const next = { ...defaultSettings(), ...(settingsOverride || {}), ...settings };
      settingsOverride = next;
      return next;
    },
    async listCodes(referrer) {
      const key = referrer.toLowerCase();
      const set = codesByReferrer.get(key);
      if (!set) return [];
      const out: ReferralCode[] = [];
      for (const code of set.values()) {
        const entry = codes.get(code);
        if (entry) out.push(entry);
      }
      return out.sort((a, b) => b.createdAt - a.createdAt);
    },
    async createCode(referrer, label) {
      const refKey = referrer.toLowerCase();
      const settings = await this.getSettings();
      const existingCodes = await this.listCodes(referrer);
      const activeCount = existingCodes.filter((c) => c.active).length;
      if (activeCount >= settings.maxActiveCodes) {
        throw new Error("Maximum active referral codes reached.");
      }

      let code = "";
      for (let i = 0; i < 5; i += 1) {
        code = generateCode();
        if (!codes.has(code)) break;
      }
      if (!code) throw new Error("Failed to generate referral code.");

      const entry: ReferralCode = {
        code,
        referrer,
        label: sanitizeLabel(label),
        createdAt: Date.now(),
        active: true,
        usageCount: 0,
      };
      codes.set(code, entry);
      const set = codesByReferrer.get(refKey) ?? new Set<string>();
      set.add(code);
      codesByReferrer.set(refKey, set);
      return entry;
    },
    async getBinding(referred) {
      return bindings.get(referred.toLowerCase()) || null;
    },
    async bindReferral(referred, codeRaw, data) {
      const code = normalizeCode(codeRaw);
      const bindingKey = referred.toLowerCase();
      const existing = bindings.get(bindingKey);
      if (existing) return existing;
      const ref = codes.get(code);
      if (!ref || !ref.active) {
        throw new Error("Invalid or inactive referral code.");
      }
      const entry: ReferralBinding = {
        referred,
        referrer: ref.referrer,
        code,
        boundAt: Date.now(),
        status: data?.depositTxHash ? "confirmed" : "pending_deposit",
        depositTxHash: data?.depositTxHash,
      };
      bindings.set(bindingKey, entry);
      ref.usageCount += 1;
      codes.set(code, ref);
      return entry;
    },
    async confirmBinding(referred, depositTxHash) {
      const bindingKey = referred.toLowerCase();
      const existing = bindings.get(bindingKey);
      if (!existing) {
        throw new Error("No referral binding found.");
      }
      const updated: ReferralBinding = {
        ...existing,
        status: "confirmed",
        depositTxHash,
      };
      bindings.set(bindingKey, updated);
      return updated;
    },
  };
}

function createUpstashStore(): ReferralsStore {
  const nonceTtlSeconds = 10 * 60;

  return {
    async getNonce(address) {
      const key = `${NONCE_PREFIX}${address.toLowerCase()}`;
      const existing = await upstashCommand<string | null>(["GET", key]);
      if (existing) return existing;
      const nonce = crypto.randomUUID();
      await upstashCommand(["SET", key, nonce, "EX", `${nonceTtlSeconds}`]);
      return nonce;
    },
    async consumeNonce(address, nonce) {
      const key = `${NONCE_PREFIX}${address.toLowerCase()}`;
      const existing = await upstashCommand<string | null>(["GET", key]);
      if (!existing || existing !== nonce) return false;
      await upstashCommand(["DEL", key]);
      return true;
    },
    async getSettings() {
      const raw = await upstashCommand<string | null>(["GET", SETTINGS_KEY]);
      if (!raw) return defaultSettings();
      try {
        const parsed = JSON.parse(raw) as ReferralSettings;
        return { ...defaultSettings(), ...parsed };
      } catch {
        return defaultSettings();
      }
    },
    async setSettings(settings) {
      const current = await this.getSettings();
      const next = { ...current, ...settings };
      await upstashCommand(["SET", SETTINGS_KEY, JSON.stringify(next)]);
      return next;
    },
    async listCodes(referrer) {
      const key = `${CODES_BY_REF_PREFIX}${referrer.toLowerCase()}`;
      const codesList = await upstashCommand<string[] | null>(["SMEMBERS", key]);
      if (!codesList || codesList.length === 0) return [];
      const out: ReferralCode[] = [];
      for (const code of codesList) {
        const raw = await upstashCommand<string | null>([
          "GET",
          `${CODE_KEY_PREFIX}${code}`,
        ]);
        if (!raw) continue;
        try {
          out.push(JSON.parse(raw) as ReferralCode);
        } catch {
          continue;
        }
      }
      return out.sort((a, b) => b.createdAt - a.createdAt);
    },
    async createCode(referrer, label) {
      const settings = await this.getSettings();
      const existingCodes = await this.listCodes(referrer);
      const activeCount = existingCodes.filter((c) => c.active).length;
      if (activeCount >= settings.maxActiveCodes) {
        throw new Error("Maximum active referral codes reached.");
      }

      let code = "";
      for (let i = 0; i < 5; i += 1) {
        code = generateCode();
        const exists = await upstashCommand<string | null>([
          "GET",
          `${CODE_KEY_PREFIX}${code}`,
        ]);
        if (!exists) break;
      }
      if (!code) throw new Error("Failed to generate referral code.");

      const entry: ReferralCode = {
        code,
        referrer,
        label: sanitizeLabel(label),
        createdAt: Date.now(),
        active: true,
        usageCount: 0,
      };

      const codeKey = `${CODE_KEY_PREFIX}${code}`;
      const refKey = `${CODES_BY_REF_PREFIX}${referrer.toLowerCase()}`;
      await upstashCommand(["SET", codeKey, JSON.stringify(entry)]);
      await upstashCommand(["SADD", refKey, code]);
      return entry;
    },
    async getBinding(referred) {
      const raw = await upstashCommand<string | null>([
        "GET",
        `${BINDING_PREFIX}${referred.toLowerCase()}`,
      ]);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as ReferralBinding;
      } catch {
        return null;
      }
    },
    async bindReferral(referred, codeRaw, data) {
      const bindingKey = `${BINDING_PREFIX}${referred.toLowerCase()}`;
      const existing = await upstashCommand<string | null>([
        "GET",
        bindingKey,
      ]);
      if (existing) {
        return JSON.parse(existing) as ReferralBinding;
      }

      const code = normalizeCode(codeRaw);
      const codeKey = `${CODE_KEY_PREFIX}${code}`;
      const codeRawStored = await upstashCommand<string | null>(["GET", codeKey]);
      if (!codeRawStored) throw new Error("Invalid or inactive referral code.");
      const refCode = JSON.parse(codeRawStored) as ReferralCode;
      if (!refCode.active) throw new Error("Invalid or inactive referral code.");

      const entry: ReferralBinding = {
        referred,
        referrer: refCode.referrer,
        code,
        boundAt: Date.now(),
        status: data?.depositTxHash ? "confirmed" : "pending_deposit",
        depositTxHash: data?.depositTxHash,
      };

      refCode.usageCount += 1;
      await upstashCommand(["SET", codeKey, JSON.stringify(refCode)]);
      await upstashCommand(["SET", bindingKey, JSON.stringify(entry)]);
      return entry;
    },
    async confirmBinding(referred, depositTxHash) {
      const bindingKey = `${BINDING_PREFIX}${referred.toLowerCase()}`;
      const existingRaw = await upstashCommand<string | null>([
        "GET",
        bindingKey,
      ]);
      if (!existingRaw) {
        throw new Error("No referral binding found.");
      }
      const existing = JSON.parse(existingRaw) as ReferralBinding;
      const updated: ReferralBinding = {
        ...existing,
        status: "confirmed",
        depositTxHash,
      };
      await upstashCommand(["SET", bindingKey, JSON.stringify(updated)]);
      return updated;
    },
  };
}

export function getReferralsStore(): ReferralsStore {
  const mode = process.env.REFERRALS_STORE || "upstash";
  if (mode === "memory") {
    if (!memoryStore) memoryStore = createMemoryStore();
    return memoryStore;
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
        `[referrals] UPSTASH_REDIS_REST_URL/TOKEN missing; using in-memory referrals store (non-production env: ${
          vercelEnv || process.env.NODE_ENV
        }).`
      );
      if (!memoryStore) memoryStore = createMemoryStore();
      return memoryStore;
    }
    throw new Error(
      "Referral storage not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return createUpstashStore();
}

export function getReferralsStoreMode(): ReferralsStoreMode {
  const mode = process.env.REFERRALS_STORE || "upstash";
  if (mode === "memory") return "memory";

  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!hasUpstash) {
    const vercelEnv = process.env.VERCEL_ENV;
    const allowMemoryFallback =
      process.env.NODE_ENV === "development" ||
      (vercelEnv && vercelEnv !== "production");
    return allowMemoryFallback ? "memory" : "upstash";
  }
  return "upstash";
}

export function validateReferralCode(code: string): string {
  const normalized = normalizeCode(code);
  if (!normalized || normalized.length < 6 || normalized.length > 12) {
    throw new Error("Invalid referral code.");
  }
  return normalized;
}

export function ensureAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error("Invalid address.");
  }
  return address as Address;
}
