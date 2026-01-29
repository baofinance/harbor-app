"use client";

import { useState, useCallback } from "react";

export interface UseModalStateOptions<Step extends string = string> {
  initialStep?: Step;
  initialAmount?: string;
  initialShowNotifications?: boolean;
  initialPermitEnabled?: boolean;
}

/**
 * Shared modal state for Genesis, Anchor, and Sail manage modals.
 * Covers amount, error, txHash, step, notifications, and permit toggle.
 */
export function useModalState<Step extends string = string>(
  options: UseModalStateOptions<Step> = {}
) {
  const {
    initialStep = "input" as Step,
    initialAmount = "",
    initialShowNotifications = false,
    initialPermitEnabled = true,
  } = options;

  const [amount, setAmount] = useState(initialAmount);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(initialStep);
  const [showNotifications, setShowNotifications] = useState(initialShowNotifications);
  const [permitEnabled, setPermitEnabled] = useState(initialPermitEnabled);

  const reset = useCallback(() => {
    setAmount(initialAmount);
    setError(null);
    setTxHash(null);
    setStep(initialStep);
    setShowNotifications(initialShowNotifications);
    setPermitEnabled(initialPermitEnabled);
  }, [
    initialAmount,
    initialStep,
    initialShowNotifications,
    initialPermitEnabled,
  ]);

  const clearError = useCallback(() => setError(null), []);

  return {
    amount,
    setAmount,
    error,
    setError,
    txHash,
    setTxHash,
    step,
    setStep,
    showNotifications,
    setShowNotifications,
    permitEnabled,
    setPermitEnabled,
    reset,
    clearError,
  };
}
