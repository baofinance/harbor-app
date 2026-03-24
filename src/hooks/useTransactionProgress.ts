/**
 * useTransactionProgress Hook
 *
 * Shared hook for transaction progress state and updates across Genesis, Sail,
 * and Anchor modals. Normalizes step updates and current index management.
 */

import { useCallback, useRef, useState } from "react";
import type { TransactionStep } from "@/components/TransactionProgressModal";

export interface UseTransactionProgressResult {
  /** Current steps */
  steps: TransactionStep[];
  /** Index of the current/active step */
  currentStepIndex: number;
  /** Whether the progress modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Open progress modal with steps, optional title, and optional initial step index */
  open: (steps: TransactionStep[], title?: string, initialStepIndex?: number) => void;
  /** Show progress modal without changing steps (for config-driven modals like Anchor) */
  show: () => void;
  /** Close progress modal */
  close: () => void;
  /** Reset all state (steps, index, close) */
  reset: () => void;
  /** Update a step by id. Optionally advance to next pending step when status becomes completed. */
  updateStep: (
    stepId: string,
    updates: Partial<TransactionStep>,
    options?: { advanceOnComplete?: boolean }
  ) => void;
  /** Set current step by step id */
  goToStep: (stepId: string) => void;
  /** Set current step by index */
  setCurrentStepIndex: (index: number) => void;
  /** Replace steps (e.g. for fallback flows). Updater may return `{ steps, currentStepIndex }` to sync index. */
  setSteps: (
    updater:
      | TransactionStep[]
      | ((
          prev: TransactionStep[]
        ) =>
          | TransactionStep[]
          | {
              steps: TransactionStep[];
              currentStepIndex?: number;
            })
  ) => void;
}

const initialState = {
  steps: [] as TransactionStep[],
  currentStepIndex: 0,
  isOpen: false,
  title: "",
};

/**
 * Hook for managing transaction progress modal state.
 * Use for Genesis and Sail modals where steps are built imperatively.
 */
export function useTransactionProgress(): UseTransactionProgressResult {
  const [steps, setStepsState] = useState<TransactionStep[]>(initialState.steps);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const [currentStepIndex, setCurrentStepIndex] = useState(initialState.currentStepIndex);
  const [isOpen, setIsOpen] = useState(initialState.isOpen);
  const [title, setTitle] = useState(initialState.title);

  const open = useCallback(
    (newSteps: TransactionStep[], newTitle = "", initialStepIndex = 0) => {
      setStepsState(newSteps);
      setCurrentStepIndex(initialStepIndex);
      setTitle(newTitle);
      setIsOpen(true);
    },
    []
  );

  const show = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setStepsState(initialState.steps);
    setCurrentStepIndex(initialState.currentStepIndex);
    setIsOpen(initialState.isOpen);
    setTitle(initialState.title);
  }, []);

  const updateStep = useCallback(
    (
      stepId: string,
      updates: Partial<TransactionStep>,
      options?: { advanceOnComplete?: boolean }
    ) => {
      setStepsState((prev) => {
        const next = prev.map((s) =>
          s.id === stepId ? { ...s, ...updates } : s
        );
        if (options?.advanceOnComplete && updates.status === "completed") {
          const nextPendingIdx = next.findIndex((s) => s.status !== "completed");
          setCurrentStepIndex(
            nextPendingIdx === -1 ? next.length - 1 : nextPendingIdx
          );
        }
        return next;
      });
    },
    []
  );

  const goToStep = useCallback((stepId: string) => {
    const idx = stepsRef.current.findIndex((s) => s.id === stepId);
    if (idx >= 0) setCurrentStepIndex(idx);
  }, []);

  const setSteps = useCallback(
    (
      updater:
        | TransactionStep[]
        | ((prev: TransactionStep[]) => TransactionStep[])
        | ((prev: TransactionStep[]) => {
            steps: TransactionStep[];
            currentStepIndex?: number;
          })
    ) => {
      setStepsState((prev) => {
        const result =
          typeof updater === "function" ? updater(prev) : updater;
        const next = Array.isArray(result) ? result : result.steps;
        const newIndex =
          Array.isArray(result) ? undefined : result.currentStepIndex;
        if (newIndex !== undefined) {
          setCurrentStepIndex(newIndex);
        } else if (typeof updater !== "function") {
          setCurrentStepIndex(0);
        }
        return next;
      });
    },
    []
  );

  return {
    steps,
    currentStepIndex,
    isOpen,
    title,
    open,
    show,
    close,
    reset,
    updateStep,
    goToStep,
    setCurrentStepIndex,
    setSteps,
  };
}
