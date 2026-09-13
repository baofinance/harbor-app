/** Shared mint dry-run parsing / capacity checks for Earn deposit. */

export const MINT_DISALLOWED_INCENTIVE_RATIO = 10n ** 18n;
/** Minter must take at least this fraction of the wrapped input. */
export const MINT_TAKEN_RATIO_OK = 0.995;
/** Treat extreme fees as effectively blocked (matches existing CTA gate). */
export const MINT_EXCESSIVE_FEE_PERCENT = 50;

export type MintDryRunParsed = {
  incentiveRatio: bigint;
  wrappedFee: bigint;
  wrappedCollateralTaken: bigint;
  peggedMinted: bigint;
};

export type MintValidationStatus =
  | "na"
  | "pending"
  | "ok"
  | "capped"
  | "blocked";

export type MintValidation = {
  status: MintValidationStatus;
  /** Short user-facing copy for banners / CTA labels. */
  message: string | null;
  feePercentage?: number;
  takenRatio?: number;
  isDisallowed?: boolean;
};

export function parseMintDryRunResult(
  data: unknown,
): MintDryRunParsed | null {
  if (data == null) return null;

  if (Array.isArray(data) && data.length >= 4) {
    try {
      return {
        incentiveRatio: BigInt(data[0] as bigint | number | string),
        wrappedFee: BigInt(data[1] as bigint | number | string),
        wrappedCollateralTaken: BigInt(data[2] as bigint | number | string),
        peggedMinted: BigInt(data[3] as bigint | number | string),
      };
    } catch {
      return null;
    }
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.incentiveRatio === undefined) return null;
    try {
      return {
        incentiveRatio: BigInt(obj.incentiveRatio as bigint | number | string),
        wrappedFee: BigInt((obj.wrappedFee ?? obj.fee ?? 0) as bigint | number | string),
        wrappedCollateralTaken: BigInt(
          (obj.wrappedCollateralTaken ?? obj.discount ?? 0) as
            | bigint
            | number
            | string,
        ),
        peggedMinted: BigInt(
          (obj.peggedMinted ?? 0) as bigint | number | string,
        ),
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function mintFeePercentageFromIncentive(
  incentiveRatio: bigint,
): number | undefined {
  if (incentiveRatio === MINT_DISALLOWED_INCENTIVE_RATIO) return undefined;
  if (incentiveRatio <= 0n) return 0;
  return Number(incentiveRatio) / 1e16;
}

export type ResolveMintValidationInput = {
  /** haTOKEN deposit — no mint. */
  isDirectPeggedDeposit: boolean;
  hasAmount: boolean;
  /** Dry-run / swap quote still in flight. */
  isLoading: boolean;
  hasDryRunError: boolean;
  dryRun: MintDryRunParsed | null;
  /** Wrapped collateral amount passed into the dry-run. */
  inputAmountWrapped: bigint | null | undefined;
};

/**
 * Decide whether the current mint size is possible from dry-run results.
 * Protocol gate is dry-run (incentive / taken), not a separate CR estimate.
 */
export function resolveMintValidation(
  input: ResolveMintValidationInput,
): MintValidation {
  if (input.isDirectPeggedDeposit) {
    return { status: "na", message: null };
  }

  if (!input.hasAmount) {
    return { status: "na", message: null };
  }

  if (input.hasDryRunError) {
    return {
      status: "blocked",
      message:
        "Unable to simulate this mint. Try a smaller amount or try again later.",
    };
  }

  if (!input.dryRun || !input.inputAmountWrapped || input.inputAmountWrapped <= 0n) {
    if (input.isLoading) {
      return {
        status: "pending",
        message: "Checking whether this mint size is possible…",
      };
    }
    return { status: "na", message: null };
  }

  const { incentiveRatio, wrappedCollateralTaken, peggedMinted } = input.dryRun;
  const isDisallowed = incentiveRatio === MINT_DISALLOWED_INCENTIVE_RATIO;
  const feePercentage = mintFeePercentageFromIncentive(incentiveRatio);
  const takenRatio =
    input.inputAmountWrapped > 0n
      ? Number(wrappedCollateralTaken) / Number(input.inputAmountWrapped)
      : 0;

  if (isDisallowed) {
    return {
      status: "blocked",
      message:
        "This size can't be minted right now, market collateral ratio is too low.",
      isDisallowed: true,
      takenRatio,
    };
  }

  if (
    wrappedCollateralTaken === 0n ||
    peggedMinted === 0n ||
    !Number.isFinite(takenRatio) ||
    takenRatio <= 0
  ) {
    return {
      status: "blocked",
      message:
        "This size can't be minted right now, market collateral ratio is too low.",
      feePercentage,
      takenRatio,
    };
  }

  if (
    feePercentage !== undefined &&
    feePercentage > MINT_EXCESSIVE_FEE_PERCENT
  ) {
    return {
      status: "blocked",
      message: `This mint would charge a ${feePercentage.toFixed(1)}% fee because collateral ratio is too low.`,
      feePercentage,
      takenRatio,
    };
  }

  if (takenRatio < MINT_TAKEN_RATIO_OK) {
    return {
      status: "capped",
      message:
        "Market can only take part of this amount. Amount may be adjusted to keep the collateral ratio healthy.",
      feePercentage,
      takenRatio,
    };
  }

  if (input.isLoading) {
    // Stale dry-run while refetching — keep prior ok/capped rather than flicker pending.
  }

  return {
    status: "ok",
    message: null,
    feePercentage,
    takenRatio,
  };
}

export function mintValidationBlocksSubmit(
  validation: MintValidation | null | undefined,
): boolean {
  if (!validation) return false;
  return validation.status === "blocked" || validation.status === "pending";
}

export function mintValidationCtaLabel(
  validation: MintValidation | null | undefined,
): string | undefined {
  if (!validation) return undefined;
  if (validation.status === "pending") return "Checking mint…";
  if (validation.status === "blocked") {
    return validation.isDisallowed ||
      (validation.message?.includes("collateral ratio") ?? false)
      ? "Mint unavailable"
      : "Amount too large";
  }
  return undefined;
}
