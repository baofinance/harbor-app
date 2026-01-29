"use client";

import { useState, useCallback } from "react";
import type {
  TransactionStep,
  TransactionStepStatus,
} from "@/components/TransactionProgressModal";

export interface UseProgressModalOptions {
  initialSteps?: TransactionStep[];
}

/**
 * Shared progress modal state for multi-step transaction flows.
 * Used by Genesis, Anchor, and Sail modals with TransactionProgressModal.
 */
export function useProgressModal(options: UseProgressModalOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<TransactionStep[]>(options.initialSteps ?? []);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const open = useCallback((progressTitle: string, initialSteps: TransactionStep[]) => {
    setTitle(progressTitle);
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSteps([]);
    setCurrentStepIndex(0);
  }, []);

  const setStepStatus = useCallback(
    (index: number, status: TransactionStepStatus, txHash?: string, error?: string) => {
      setSteps((prev) => {
        const next = [...prev];
        if (index >= 0 && index < next.length) {
          next[index] = {
            ...next[index],
            status,
            ...(txHash != null && { txHash }),
            ...(error != null && { error }),
          };
        }
        return next;
      });
    },
    []
  );

  const setCurrentStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentStepIndex((i) => i + 1);
  }, []);

  const updateSteps = useCallback((newSteps: TransactionStep[]) => {
    setSteps(newSteps);
  }, []);

  return {
    isOpen,
    title,
    steps,
    currentStepIndex,
    open,
    close,
    setStepStatus,
    setCurrentStep,
    advanceStep,
    updateSteps,
    setTitle,
  };
}
