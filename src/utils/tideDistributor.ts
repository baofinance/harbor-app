import { formatToken } from "@/utils/formatters";
import type { VeClaimStatus } from "@/abis/harborTideDistributor";
import { TIDE_CONFIG } from "@/config/tide";
import { isVeBaoLockExpired } from "@/utils/veBaoLock";

export type TideClaimWindowStatus = "loading" | "not_started" | "open" | "ended";

export type VeBaoClaimBlockerKind =
  | "extend_lock"
  | "lock_expired"
  | "insufficient_locked"
  | "already_claimed"
  | "pool_cap"
  | "not_eligible";

export type VeBaoClaimBlocker = {
  kind: VeBaoClaimBlockerKind;
  title?: string;
  message: string;
  detail?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function formatTideUnixDate(
  timestampSec: bigint,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(Number(timestampSec) * 1000).toLocaleDateString(
    undefined,
    options ?? {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

/** Lock must end strictly after distributor endDate (exclusive window end). */
export function isVeBaoLockEndTooEarly(
  status: VeClaimStatus,
  endDate: bigint
): boolean {
  return status.veEnd <= endDate;
}

export function getVeBaoClaimBlocker(
  status: VeClaimStatus | undefined,
  endDate?: bigint,
  nowSec: bigint = BigInt(Math.floor(Date.now() / 1000)),
): VeBaoClaimBlocker | null {
  if (!status) return null;
  if (status.alreadyClaimed) {
    return {
      kind: "already_claimed",
      message: "You have already claimed your veBAO TIDE allocation.",
    };
  }
  if (!status.poolCapAvailable) {
    return {
      kind: "pool_cap",
      message: "veBAO claim pool cap reached — try again later.",
    };
  }
  if (status.lockedAmount < status.baoRequired) {
    return {
      kind: "insufficient_locked",
      message: `Keep at least ${formatToken(status.baoRequired, 18, 2)} BAO locked on veBAO (do not withdraw below your allocation).`,
    };
  }

  if (isVeBaoLockExpired(status.veEnd, nowSec)) {
    return {
      kind: "lock_expired",
      title: "veBAO lock expired",
      message:
        "Withdraw BAO from veBAO, then use the Swap card below with liquid BAO.",
      detail: `Your lock ended: ${formatTideUnixDate(status.veEnd)}`,
      ctaLabel: "Withdraw on BAO Finance",
      ctaHref: TIDE_CONFIG.veBaoAppUrl,
    };
  }

  const lockTooEarly =
    endDate !== undefined
      ? isVeBaoLockEndTooEarly(status, endDate)
      : status.veEnd <= status.minUnlockTime - 1n;

  if (lockTooEarly) {
    const requiredAfter =
      endDate !== undefined
        ? formatTideUnixDate(endDate)
        : formatTideUnixDate(status.minUnlockTime - 1n);
    const requiredBy =
      endDate !== undefined
        ? formatTideUnixDate(status.minUnlockTime)
        : formatTideUnixDate(status.minUnlockTime);

    return {
      kind: "extend_lock",
      title: "Extend your veBAO lock",
      message:
        "Your lock must end after 31 December 2026 to claim TIDE. Max-lock for 4 years to become eligible.",
      detail: `Your lock currently ends: ${formatTideUnixDate(status.veEnd)} · Required: after ${requiredAfter} (${requiredBy} or later)`,
    };
  }

  if (!status.canClaimNow) {
    return {
      kind: "not_eligible",
      message: "Not eligible to claim veBAO allocation yet.",
    };
  }

  return null;
}

/** @deprecated Use getVeBaoClaimBlocker for structured UI copy. */
export function getVeBaoClaimBlockReason(
  status: VeClaimStatus | undefined,
  endDate?: bigint
): string | null {
  return getVeBaoClaimBlocker(status, endDate)?.message ?? null;
}

export function getTideClaimWindowStatus(
  startDate?: bigint,
  endDate?: bigint
): TideClaimWindowStatus {
  if (startDate === undefined || endDate === undefined) return "loading";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < startDate) return "not_started";
  if (now >= endDate) return "ended";
  return "open";
}

export function formatTideClaimWindowMessage(
  status: TideClaimWindowStatus,
  startDate?: bigint,
  endDate?: bigint
): string | null {
  if (status === "loading") return null;
  if (status === "not_started") {
    return formatTideClaimScheduleMessage();
  }
  if (status === "ended" && endDate !== undefined) {
    return `Claim window ended ${new Date(Number(endDate) * 1000).toLocaleString()}`;
  }
  return null;
}

function formatTideWindowMonthYear(timestampSec: bigint): string {
  return new Date(Number(timestampSec) * 1000).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatTideAirdropScheduleFooter(): string {
  return `Will be airdropped ${TIDE_CONFIG.airdropClaimScheduleLabel}`;
}

export function formatTideClaimScheduleMessage(): string {
  return `Claims ${TIDE_CONFIG.airdropClaimScheduleLabel}`;
}

export function formatTideClaimScheduleFooter(): string {
  return formatTideClaimScheduleMessage();
}

/** Compact claim window copy for card footers. */
export function formatTideClaimWindowFooter(
  status: TideClaimWindowStatus,
  _startDate?: bigint,
  endDate?: bigint
): string | null {
  if (status === "loading") return null;
  if (status === "not_started") {
    return formatTideClaimScheduleFooter();
  }
  if (status === "open" && endDate !== undefined) {
    return `Claim window open · ends ${formatTideWindowMonthYear(endDate)}`;
  }
  if (status === "ended" && endDate !== undefined) {
    return `Claim window ended ${formatTideWindowMonthYear(endDate)}`;
  }
  return null;
}

export function formatTideAirdropMonthYear(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function parseTideClaimError(error: unknown): string {
  const err = error as { shortMessage?: string; message?: string; cause?: { reason?: string } };
  const raw = err?.shortMessage || err?.cause?.reason || err?.message || "Transaction failed";
  if (raw.includes("AlreadyClaimed")) return "You have already claimed on this path";
  if (raw.includes("InvalidProof")) return "Invalid merkle proof — amount must match snapshot exactly";
  if (raw.includes("ClaimNotStarted")) {
    return `Claims ${TIDE_CONFIG.airdropClaimScheduleLabel}`;
  }
  if (raw.includes("ClaimEnded")) return "Claim window has ended";
  if (raw.includes("LockEndTooEarly")) {
    return "Your lock must end after 31 December 2026 to claim TIDE. Extend your lock on veBAO, then return here to claim.";
  }
  if (raw.includes("InsufficientLocked")) {
    return "Insufficient BAO locked in veBAO — keep at least your allocation amount locked.";
  }
  if (raw.includes("BelowMinSwap")) return "Swap amount is below the minimum (10 TIDE)";
  if (raw.includes("User rejected")) return "Transaction rejected";
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}
