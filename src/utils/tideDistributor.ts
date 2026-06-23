import { formatToken } from "@/utils/formatters";
import type { VeClaimStatus } from "@/abis/harborTideDistributor";

export type TideClaimWindowStatus = "loading" | "not_started" | "open" | "ended";

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
  if (status === "not_started" && startDate !== undefined) {
    return `Claims open ${new Date(Number(startDate) * 1000).toLocaleString()}`;
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

/** Compact claim window copy for card footers. */
export function formatTideClaimWindowFooter(
  status: TideClaimWindowStatus,
  startDate?: bigint,
  endDate?: bigint
): string | null {
  if (status === "loading") return null;
  if (status === "not_started" && startDate !== undefined) {
    return `Claims open ${formatTideWindowMonthYear(startDate)}`;
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

export function getVeBaoClaimBlockReason(
  status: VeClaimStatus | undefined
): string | null {
  if (!status) return null;
  if (status.alreadyClaimed) return "Already claimed on this path";
  if (!status.poolCapAvailable) return "veBAO claim pool cap reached";
  if (status.lockedAmount < status.baoRequired) {
    return `Need at least ${formatToken(status.baoRequired, 18, 2)} BAO locked in veBAO`;
  }
  if (status.veEnd <= status.minUnlockTime - 1n) {
    return "Extend veBAO lock past the claim window before claiming";
  }
  if (!status.canClaimNow) return "Not eligible to claim veBAO allocation yet";
  return null;
}

export function parseTideClaimError(error: unknown): string {
  const err = error as { shortMessage?: string; message?: string; cause?: { reason?: string } };
  const raw = err?.shortMessage || err?.cause?.reason || err?.message || "Transaction failed";
  if (raw.includes("AlreadyClaimed")) return "You have already claimed on this path";
  if (raw.includes("InvalidProof")) return "Invalid merkle proof — amount must match snapshot exactly";
  if (raw.includes("ClaimNotStarted")) return "Claim window has not started yet";
  if (raw.includes("ClaimEnded")) return "Claim window has ended";
  if (raw.includes("LockEndTooEarly")) return "Extend veBAO lock past the claim window";
  if (raw.includes("InsufficientLocked")) return "Insufficient BAO locked in veBAO";
  if (raw.includes("BelowMinSwap")) return "Swap amount is below the minimum (10 TIDE)";
  if (raw.includes("User rejected")) return "Transaction rejected";
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}
