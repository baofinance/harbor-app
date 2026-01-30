/**
 * Transaction / wallet error helpers.
 * Shared across Anchor, Genesis, Sail modals and other tx flows.
 */

/**
 * Detect user rejection of a transaction (wallet "Cancel" / "Reject").
 * Handles MetaMask (4001), WalletConnect-style (4900), and common message substrings.
 */
export function isUserRejection(err: unknown): boolean {
  const e = err as { message?: string; shortMessage?: string; code?: number; name?: string } | undefined;
  if (!e) return false;
  const msg = (e?.message ?? "") + " " + (e?.shortMessage ?? "") + " " + (e?.name ?? "");
  const lower = msg.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("rejected") ||
    e?.name === "UserRejectedRequestError"
  )
    return true;
  const code = typeof e?.code === "number" ? e.code : undefined;
  return code === 4001 || code === 4900;
}
