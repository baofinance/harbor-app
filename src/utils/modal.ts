/**
 * Shared modal helpers (tab mapping, error messages, defaults).
 * Use these across Genesis, Sail, and Anchor modals for consistent init/reset.
 */

import type { TransactionStep } from "@/types/modal";

export type DepositWithdrawTab = "deposit" | "withdraw";

/** Shared defaults for options used across Genesis, Sail, and Anchor modals. */
export const DEFAULT_MODAL_OPTIONS = {
  permitEnabled: true,
  showNotifications: false,
} as const;

/** Shared base-form defaults (amount, error, txHash). */
export const DEFAULT_AMOUNT = "";
export const DEFAULT_ERROR = null as string | null;
export const DEFAULT_TX_HASH = null as string | null;

/** Shared progress-modal defaults (Genesis Deposit/Withdraw, Sail). */
export const DEFAULT_PROGRESS_MODAL_OPEN = false;
export const DEFAULT_PROGRESS_STEPS: TransactionStep[] = [];
export const DEFAULT_CURRENT_STEP_INDEX = 0;

/** Sail-style progress modal state. Genesis uses open + steps + index separately. */
export interface ProgressModalState {
  isOpen: boolean;
  title: string;
  steps: TransactionStep[];
  currentStepIndex: number;
}

export const DEFAULT_PROGRESS_MODAL_STATE: ProgressModalState = {
  isOpen: false,
  title: "",
  steps: [],
  currentStepIndex: 0,
};

/** Delay (ms) to wait after a tx before reading state (e.g. balance). Used by Anchor, Genesis, etc. */
export const POST_TX_SETTLE_MS = 2000;

/** Shorter delay (ms) after approve tx before refetch / next step. */
export const POST_APPROVE_SETTLE_MS = 1000;

/** Brief delay (ms) after approve before redeem / other follow-up step. */
export const POST_APPROVE_SHORT_MS = 500;

/** Resolve after `ms` milliseconds. Use for post-tx settle delay. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Centralized error copy for modals. Use these keys everywhere for consistent messaging. */
export const MODAL_ERROR_MESSAGES = {
  INVALID_AMOUNT: "Please enter a valid amount",
  INVALID_AMOUNT_REDEEM: "Please enter a valid amount to redeem",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  AMOUNT_EXCEEDS_DEPOSIT: "Amount exceeds your deposit",
  NO_DEPOSIT_TO_WITHDRAW: "No deposit available to withdraw",
} as const;

/**
 * Map initialTab prop (mint | deposit | withdraw | redeem | …) to "deposit" | "withdraw".
 * Used by Anchor and any modal that accepts mint/deposit/withdraw/redeem-style initialTab.
 */
export function mapInitialTabToDepositWithdraw(
  initialTab: string
): DepositWithdrawTab {
  if (
    initialTab === "mint" ||
    initialTab === "deposit" ||
    initialTab === "deposit-mint"
  )
    return "deposit";
  if (
    initialTab === "withdraw" ||
    initialTab === "redeem" ||
    initialTab === "withdraw-redeem"
  )
    return "withdraw";
  return "deposit";
}
