import { describe, expect, it } from "vitest";
import type { VeClaimStatus } from "@/abis/harborTideDistributor";
import { getVeBaoClaimBlocker } from "./tideDistributor";
import {
  getVeBaoMaxUnlockTime,
  isVeBaoLockExpired,
  VE_BAO_MAX_LOCK_SECONDS,
} from "./veBaoLock";

const END_DATE = 1_797_724_800n; // 2027-01-01 UTC

function baseStatus(overrides: Partial<VeClaimStatus> = {}): VeClaimStatus {
  return {
    veEnd: END_DATE - 86_400n,
    lockedAmount: 1_000n * 10n ** 18n,
    baoRequired: 500n * 10n ** 18n,
    minUnlockTime: END_DATE + 1n,
    canClaimNow: false,
    alreadyClaimed: false,
    poolCapAvailable: true,
    ...overrides,
  };
}

describe("getVeBaoClaimBlocker lock states", () => {
  it("returns extend_lock when lock is active but ends too early", () => {
    const now = 1_700_000_000n;
    const blocker = getVeBaoClaimBlocker(
      baseStatus({ veEnd: now + 86_400n }),
      END_DATE,
      now,
    );

    expect(blocker?.kind).toBe("extend_lock");
    expect(blocker?.ctaHref).toBeUndefined();
  });

  it("returns lock_expired when lock has ended", () => {
    const now = 1_800_000_000n;
    const blocker = getVeBaoClaimBlocker(
      baseStatus({ veEnd: now - 86_400n }),
      END_DATE,
      now,
    );

    expect(blocker?.kind).toBe("lock_expired");
    expect(blocker?.ctaHref).toBe("https://app.baofinance.io");
    expect(blocker?.message).toMatch(/Swap card below/i);
  });
});

describe("veBaoLock helpers", () => {
  it("computes max unlock time as now + 4 years", () => {
    const now = 1_700_000_000n;
    expect(getVeBaoMaxUnlockTime(now)).toBe(now + VE_BAO_MAX_LOCK_SECONDS);
  });

  it("detects expired locks", () => {
    const now = 1_700_000_000n;
    expect(isVeBaoLockExpired(now - 1n, now)).toBe(true);
    expect(isVeBaoLockExpired(now + 1n, now)).toBe(false);
  });
});
