"use client";

import React from "react";

interface ModalStepActionsProps {
  isProcessing: boolean;
  step: string;
  onCancel: () => void;
  onRetry: () => void;
  onBack: () => void;
  onPrimary: () => void;
  primaryDisabled: boolean;
  getButtonText: () => string;
  /** Label for disabled primary when isProcessing (e.g. "Processing..."). Default: getButtonText(). */
  processingLabel?: string;
  wrapperClassName?: string;
}

const btnCancel =
  "flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors";
const btnPrimary =
  "flex-1 py-2 px-4 bg-[#FF8A7A] text-white font-semibold hover:bg-[#FF6B5A] transition-colors";
const btnPrimaryDisabled =
  "flex-1 py-2 px-4 bg-[#FF8A7A]/50 text-white font-semibold cursor-not-allowed";
const btnPrimaryWithDisabled =
  "flex-1 py-2 px-4 bg-[#FF8A7A] text-white font-semibold hover:bg-[#FF6B5A] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

/**
 * Modal actions: Cancel / Processing / Retry / Back + primary.
 * Shared across Anchor withdraw (simple + advanced), etc.
 */
export function ModalStepActions({
  isProcessing,
  step,
  onCancel,
  onRetry,
  onBack,
  onPrimary,
  primaryDisabled,
  getButtonText,
  processingLabel,
  wrapperClassName = "flex gap-3 pt-4 border-t border-[#1E4775]/20",
}: ModalStepActionsProps) {
  if (isProcessing) {
    return (
      <div className={wrapperClassName}>
        <button type="button" onClick={onCancel} className={btnCancel}>
          Cancel
        </button>
        <button type="button" disabled className={btnPrimaryDisabled}>
          {processingLabel ?? getButtonText()}
        </button>
      </div>
    );
  }
  if (step === "error") {
    return (
      <div className={wrapperClassName}>
        <button type="button" onClick={onCancel} className={btnCancel}>
          Cancel
        </button>
        <button type="button" onClick={onRetry} className={btnPrimary}>
          Try Again
        </button>
      </div>
    );
  }
  const isInput = step === "input";
  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={isInput ? onCancel : onBack}
        className={btnCancel}
      >
        {isInput ? "Cancel" : "Back"}
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className={btnPrimaryWithDisabled}
      >
        {getButtonText()}
      </button>
    </div>
  );
}
