/** Curve VotingEscrow max lock duration (4 years). */
export const VE_BAO_MAX_LOCK_SECONDS = 126_144_000n;

export function veBaoNowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/** Unlock timestamp for a max-length veBAO lock from `nowSec`. */
export function getVeBaoMaxUnlockTime(nowSec: bigint = veBaoNowSeconds()): bigint {
  return nowSec + VE_BAO_MAX_LOCK_SECONDS;
}

export function isVeBaoLockExpired(
  veEnd: bigint,
  nowSec: bigint = veBaoNowSeconds(),
): boolean {
  return veEnd <= nowSec;
}

export function parseVeBaoLockError(error: unknown): string {
  const err = error as {
    shortMessage?: string;
    message?: string;
    cause?: { reason?: string };
  };
  const raw =
    err?.shortMessage || err?.cause?.reason || err?.message || "Transaction failed";

  if (raw.includes("Lock expired")) {
    return "Your veBAO lock has expired. Withdraw BAO on BAO Finance, then swap below.";
  }
  if (raw.includes("Nothing is locked")) {
    return "No BAO is locked in veBAO.";
  }
  if (raw.includes("Can only increase lock duration")) {
    return "Your lock already ends at or after the max-lock time.";
  }
  if (raw.includes("Voting lock can be 4 years max")) {
    return "veBAO locks cannot exceed 4 years.";
  }
  if (raw.includes("User rejected")) return "Transaction rejected";

  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}
