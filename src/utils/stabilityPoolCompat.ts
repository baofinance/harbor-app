/**
 * Stability pool reads that differ between v2 and v3.
 * Live markets still answer the v2 names. haEUR2 answers only the v3 names.
 * Call the v3 name first and keep the v2 name when that call reverts.
 */

export const STABILITY_POOL_WAD = 10n ** 18n;

export function pickDefinedBigint(
  newer: unknown,
  older: unknown,
): bigint | undefined {
  if (typeof newer === "bigint") return newer;
  if (typeof older === "bigint") return older;
  return undefined;
}

export function asUintPair(
  value: unknown,
): readonly [bigint, bigint] | undefined {
  if (Array.isArray(value) && value.length >= 2) {
    const start = value[0];
    const end = value[1];
    if (typeof start === "bigint" && typeof end === "bigint") {
      return [start, end];
    }
  }
  if (value && typeof value === "object") {
    const record = value as { start?: bigint; end?: bigint; startDelay?: bigint; endWindow?: bigint };
    const start = record.start ?? record.startDelay;
    const end = record.end ?? record.endWindow;
    if (typeof start === "bigint" && typeof end === "bigint") {
      return [start, end];
    }
  }
  return undefined;
}

export function isWithdrawalWindowOpen(
  request: readonly [bigint, bigint] | undefined,
  nowSec: bigint = BigInt(Math.floor(Date.now() / 1000)),
): boolean {
  if (!request) return false;
  const [start, end] = request;
  if (start === 0n || end <= start) return false;
  return nowSec >= start && nowSec <= end;
}

export type WithdrawalEstimate = {
  leaving: bigint;
  feeAmount: bigint;
  netAmount: bigint;
};

/**
 * v3 charges the early-withdrawal fee on what exceeds the fee-free amount.
 * v2, when `feeFreeAmount` is omitted, treats an open window as fully free.
 * `headroom` omitted means the contract's own cap is left in place.
 */
export function estimateStabilityPoolWithdrawal(input: {
  amount: bigint;
  headroom?: bigint;
  feeRatio?: bigint;
  windowOpen: boolean;
  feeFreeAmount?: bigint;
  exempt?: boolean;
}): WithdrawalEstimate {
  const amount = input.amount > 0n ? input.amount : 0n;
  const leaving =
    input.headroom !== undefined && amount > input.headroom
      ? input.headroom
      : amount;
  const covered = !input.windowOpen
    ? 0n
    : input.feeFreeAmount === undefined
      ? leaving
      : input.feeFreeAmount;
  if (
    input.exempt ||
    leaving <= covered ||
    input.feeRatio === undefined ||
    input.feeRatio === 0n
  ) {
    return { leaving, feeAmount: 0n, netAmount: leaving };
  }
  const feeAmount =
    ((leaving - covered) * input.feeRatio) / STABILITY_POOL_WAD;
  const netAmount = leaving > feeAmount ? leaving - feeAmount : 0n;
  return { leaving, feeAmount, netAmount };
}

/**
 * Pool-share symbol for an anchored token.
 * haEUR2 → hspEUR2. Tokens that are not `ha…` stay unlabeled.
 */
export function stabilityPoolShareLabel(
  pegSymbol: string | undefined,
): string | null {
  const raw = pegSymbol?.trim();
  if (!raw || raw.length <= 2 || !raw.toLowerCase().startsWith("ha")) return null;
  return `hsp${raw.slice(2)}`;
}

/** ha Harbor Anchored, hs Harbor Sail, hsp Harbor Stability Pool, hy Harbor Yield. */
export function harborTokenTitle(symbol: string | undefined): string | null {
  const lower = symbol?.trim().toLowerCase();
  if (!lower) return null;
  if (lower.startsWith("hsp")) return "Harbor Stability Pool";
  if (lower.startsWith("hy")) return "Harbor Yield";
  if (lower.startsWith("hs")) return "Harbor Sail";
  if (lower.startsWith("ha")) return "Harbor Anchored";
  return null;
}

/** `haEUR2 (Harbor Anchored)`, or the symbol alone when it has no Harbor prefix. */
export function harborTokenWithTitle(symbol: string | undefined): string {
  const raw = symbol?.trim();
  if (!raw) return "";
  const title = harborTokenTitle(raw);
  return title ? `${raw} (${title})` : raw;
}

type ContractReader = {
  readContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[] | unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

/** v3 `claimable(account, tokens[])`, then v2 `claimable(account, token)`. */
export async function readStabilityPoolClaimable(
  client: ContractReader,
  pool: `0x${string}`,
  account: `0x${string}`,
  token: `0x${string}`,
  abi: readonly unknown[] | unknown[],
): Promise<bigint> {
  try {
    const amounts = await client.readContract({
      address: pool,
      abi,
      functionName: "claimable",
      args: [account, [token]],
    });
    if (Array.isArray(amounts) && typeof amounts[0] === "bigint") {
      return amounts[0];
    }
  } catch {
    // v2 pools revert the list form.
  }
  const single = await client.readContract({
    address: pool,
    abi,
    functionName: "claimable",
    args: [account, token],
  });
  return typeof single === "bigint" ? single : 0n;
}
