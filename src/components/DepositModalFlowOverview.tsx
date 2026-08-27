"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

type DepositModalFlowOverviewProps = {
  parts: string[];
  /** 0-based index of the active step. Previous steps can be clicked when `onStepClick` is set. */
  activeIndex?: number;
  /** Navigate to a previous step (index < activeIndex). */
  onStepClick?: (index: number) => void;
  /** Go back one step (chevron). Called when activeIndex > 0. */
  onBack?: () => void;
};

/** Centered flow summary under modal tabs (e.g. Buy / Mint › Deposit). */
export function DepositModalFlowOverview({
  parts,
  activeIndex,
  onStepClick,
  onBack,
}: DepositModalFlowOverviewProps) {
  if (parts.length === 0) return null;

  const resolvedActive =
    activeIndex === undefined
      ? parts.length - 1
      : Math.min(Math.max(activeIndex, 0), parts.length - 1);

  const canGoBackOne = resolvedActive > 0 && Boolean(onBack ?? onStepClick);

  const handleChevronBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (onStepClick && resolvedActive > 0) {
      onStepClick(resolvedActive - 1);
    }
  };

  return (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center border-b border-[#e2e8f0] pb-3">
      <div className="flex justify-start">
        {canGoBackOne ? (
          <button
            type="button"
            onClick={handleChevronBack}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#1E4775] transition hover:bg-[#1E4775]/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25"
            aria-label="Go back one step"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm">
        {parts.map((part, index) => {
          const isActive = index === resolvedActive;
          const isPast = index < resolvedActive;
          const canGoBack = Boolean(onStepClick) && isPast;

          return (
            <React.Fragment key={`${index}-${part}`}>
              {index > 0 ? (
                <span className="font-normal text-[#94a3b8]" aria-hidden>
                  ›
                </span>
              ) : null}
              {canGoBack ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className="rounded-md px-1.5 py-0.5 font-normal text-[#64748b] underline decoration-[#64748b]/35 underline-offset-2 transition hover:bg-[#1E4775]/8 hover:text-[#1E4775] hover:decoration-[#1E4775]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25"
                >
                  {part}
                </button>
              ) : (
                <span
                  className={
                    isActive
                      ? "font-semibold text-[#1E4775]"
                      : isPast
                        ? "font-normal text-[#64748b]"
                        : "font-normal text-[#94a3b8]"
                  }
                  aria-current={isActive ? "step" : undefined}
                >
                  {part}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
    </div>
  );
}
