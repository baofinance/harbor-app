"use client";

import { useCallback } from "react";

export interface UseModalCloseHandlerOptions {
  onClose: () => void;
  setAmount: (v: string) => void;
  setStep: (s: string) => void;
  setError: (e: string | null) => void;
  setTxHash?: (h: string | null) => void;
  /** When current step is in this list, close is no-op (modal stays open). */
  busySteps?: string[];
  /** If false, only call onClose (no reset). Default true. */
  resetOnClose?: boolean;
}

/**
 * Returns a handleClose that resets modal state and calls onClose.
 * Optionally blocks close when step is in busySteps (e.g. approving, minting).
 */
export function useModalCloseHandler({
  onClose,
  setAmount,
  setStep,
  setError,
  setTxHash,
  busySteps = [],
  resetOnClose = true,
}: UseModalCloseHandlerOptions) {
  return useCallback(
    (currentStep?: string) => {
      if (currentStep && busySteps.length > 0 && busySteps.includes(currentStep)) {
        return;
      }
      if (resetOnClose) {
        setAmount("");
        setStep("input");
        setError(null);
        setTxHash?.(null);
      }
      onClose();
    },
    [onClose, setAmount, setStep, setError, setTxHash, busySteps, resetOnClose]
  );
}
