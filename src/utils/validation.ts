/**
 * Shared validation helpers for modals and forms.
 */

import { parseEther, parseUnits } from "viem";

export interface ValidateAmountResult {
  valid: boolean;
  error?: string;
}

export interface ValidateAmountOptions {
  /** Error message when amount is missing or <= 0. Default: "Please enter a valid amount". */
  invalidAmountMessage?: string;
  /** Error when amount > balance. Default: "Insufficient balance". */
  insufficientBalanceMessage?: string;
  /** Error when amount > max (e.g. deposit to withdraw). Default: "Amount exceeds your deposit". */
  exceedsMaxMessage?: string;
  /** If set, also check amount <= max (e.g. user deposit). */
  max?: bigint;
  /** Custom "no max" message (e.g. "No deposit available to withdraw"). */
  noMaxMessage?: string;
  /** Token decimals for parsing amount string. Default 18. */
  decimals?: number;
}

function parseAmountToWei(amountStr: string, decimals: number): bigint | null {
  const trimmed = amountStr?.trim() ?? "";
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  try {
    if (decimals === 18) return parseEther(trimmed);
    return parseUnits(trimmed, decimals);
  } catch {
    return null;
  }
}

/**
 * Validate amount input for deposit/mint flows.
 * Checks: non-empty, > 0, <= balance. Optionally <= max (e.g. withdrawable).
 * Amount string is parsed as token units (default 18 decimals).
 */
export function validateAmount(
  amount: string,
  balance: bigint,
  options: ValidateAmountOptions = {}
): ValidateAmountResult {
  const {
    invalidAmountMessage = "Please enter a valid amount",
    insufficientBalanceMessage = "Insufficient balance",
    exceedsMaxMessage = "Amount exceeds your deposit",
    max,
    noMaxMessage,
    decimals = 18,
  } = options;

  const trimmed = amount?.trim() ?? "";
  if (!trimmed) {
    return { valid: false, error: invalidAmountMessage };
  }
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, error: invalidAmountMessage };
  }

  const amountWei = parseAmountToWei(trimmed, decimals);
  if (amountWei === null) {
    return { valid: false, error: invalidAmountMessage };
  }

  if (max !== undefined) {
    if (max === 0n && noMaxMessage) {
      return { valid: false, error: noMaxMessage };
    }
    if (amountWei > max) {
      return { valid: false, error: exceedsMaxMessage };
    }
  }

  if (amountWei > balance) {
    return { valid: false, error: insufficientBalanceMessage };
  }

  return { valid: true };
}

/**
 * Validate amount for withdraw flows: checks <= deposit (max).
 * Use noMaxMessage when max is 0 (no deposit to withdraw).
 * Amount string parsed as 18 decimals by default.
 */
export function validateAmountForWithdraw(
  amount: string,
  depositMax: bigint,
  options: {
    invalidAmountMessage?: string;
    exceedsMaxMessage?: string;
    noMaxMessage?: string;
    decimals?: number;
  } = {}
): ValidateAmountResult {
  const {
    invalidAmountMessage = "Please enter a valid amount",
    exceedsMaxMessage = "Amount exceeds your deposit",
    noMaxMessage = "No deposit available to withdraw",
    decimals = 18,
  } = options;

  const trimmed = amount?.trim() ?? "";
  if (!trimmed) {
    return { valid: false, error: invalidAmountMessage };
  }
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, error: invalidAmountMessage };
  }
  if (depositMax === 0n) {
    return { valid: false, error: noMaxMessage };
  }
  const amountWei = parseAmountToWei(trimmed, decimals);
  if (amountWei === null) {
    return { valid: false, error: invalidAmountMessage };
  }
  if (amountWei > depositMax) {
    return { valid: false, error: exceedsMaxMessage };
  }
  return { valid: true };
}

const AMOUNT_INPUT_REGEX = /^\d*\.?\d*$/;

/**
 * Check if a string is valid for amount input (digits and optional single decimal).
 * Use in onChange to reject invalid keystrokes.
 */
export function validateAmountInput(value: string): boolean {
  if (value === "") return true;
  return AMOUNT_INPUT_REGEX.test(value);
}
