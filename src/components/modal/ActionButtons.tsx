"use client";

import React from "react";

interface ActionButtonsProps {
  primaryLabel: string;
  primaryAction: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  secondaryDisabled?: boolean;
  variant?: "default" | "pearl";
}

const variantClasses = {
  default: "bg-[#1E4775] hover:bg-[#17395F]",
  pearl: "bg-[#FF8A7A] hover:bg-[#FF6B5A]",
};

/**
 * Modal action buttons: secondary (Cancel) + primary. Matches Genesis/Anchor/Sail styling.
 */
export function ActionButtons({
  primaryLabel,
  primaryAction,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel = "Cancel",
  secondaryAction,
  secondaryDisabled = false,
  variant = "pearl",
}: ActionButtonsProps) {
  const primaryClass = variantClasses[variant];

  return (
    <div className="flex gap-3 mt-4">
      {secondaryAction != null && (
        <button
          type="button"
          onClick={secondaryAction}
          disabled={secondaryDisabled}
          className="flex-1 py-3 px-4 bg-white border-2 border-[#1E4775]/30 text-[#1E4775] font-semibold transition-colors hover:bg-[#1E4775]/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {secondaryLabel}
        </button>
      )}
      <button
        type="button"
        onClick={primaryAction}
        disabled={primaryDisabled || primaryLoading}
        className={`flex-1 py-3 px-4 text-white font-semibold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${primaryClass}`}
      >
        {primaryLoading ? "..." : primaryLabel}
      </button>
    </div>
  );
}
