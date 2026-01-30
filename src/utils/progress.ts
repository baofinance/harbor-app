/**
 * Shared progress-modal helpers.
 * Used by Anchor, Genesis, and Sail modals (TransactionProgressModal).
 */

import type { TransactionStep } from "@/types/modal";

/**
 * Compute effective "current" step index for display.
 * First in_progress, else first pending, else last step (or 0 if empty).
 * Genesis/Sail can use this when deriving index from step statuses.
 */
export function computeCurrentStepIndex(
  steps: TransactionStep[]
): number {
  const activeIdx = steps.findIndex((s) => s.status === "in_progress");
  if (activeIdx >= 0) return activeIdx;
  const pendingIdx = steps.findIndex((s) => s.status === "pending");
  if (pendingIdx >= 0) return pendingIdx;
  if (steps.length === 0) return 0;
  return steps.length - 1;
}

/**
 * Apply pending / in_progress / completed / error status to steps in place.
 * Use when you have a logical "current" index and optional error state.
 * Anchor uses this after mapping flow step -> index; Genesis/Sail update status imperatively.
 */
export function applyStepStatuses(
  steps: TransactionStep[],
  currentIndex: number,
  isError: boolean
): void {
  steps.forEach((s, idx) => {
    if (isError && idx === currentIndex) {
      s.status = "error";
    } else if (idx < currentIndex) {
      s.status = "completed";
    } else if (idx === currentIndex) {
      s.status = isError ? "error" : "in_progress";
    } else {
      s.status = "pending";
    }
  });
}

/**
 * Apply statuses including "success" (all completed).
 * When isSuccess, every step is completed; otherwise same as applyStepStatuses.
 */
export function applyStepStatusesWithSuccess(
  steps: TransactionStep[],
  currentIndex: number,
  isError: boolean,
  isSuccess: boolean
): void {
  if (isSuccess) {
    steps.forEach((s) => {
      s.status = "completed";
    });
    return;
  }
  applyStepStatuses(steps, currentIndex, isError);
}

export interface ProgressModalHandlersConfig {
  onClose: () => void;
  resetProgress: () => void;
  resetForm?: () => void;
}

/**
 * Shared close/retry handlers for progress modals.
 * Anchor, Genesis, and Sail can use this with their own resetProgress / resetForm.
 * - handleClose: reset progress, then call onClose.
 * - handleRetry: reset progress, then resetForm (no onClose).
 */
export function createProgressModalHandlers({
  onClose,
  resetProgress,
  resetForm,
}: ProgressModalHandlersConfig): {
  handleClose: () => void;
  handleRetry: () => void;
} {
  return {
    handleClose: () => {
      resetProgress();
      onClose();
    },
    handleRetry: () => {
      resetProgress();
      resetForm?.();
    },
  };
}
