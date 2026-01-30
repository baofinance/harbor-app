/**
 * Shared modal and transaction step types.
 * Used by TransactionProgressModal and modals (Genesis, Anchor, Sail).
 */

export type TransactionStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "error";

export interface TransactionStep {
  id: string;
  label: string;
  status: TransactionStepStatus;
  txHash?: string;
  error?: string;
  details?: string;
  fee?: {
    amount: bigint;
    formatted: string;
    usd?: number;
    percentage?: number;
    tokenSymbol: string;
  };
}

/**
 * Base modal steps shared across flows. Modals extend with flow-specific steps
 * (e.g. "approving" | "depositing" | "withdrawing" | "minting" | "redeeming").
 */
export type ModalStepBase = "input" | "success" | "error";
