"use client";

import React from "react";

type DepositModalFlowOverviewProps = {
  parts: string[];
  /** 0-based index of the active step. Previous steps can be clicked when `onStepClick` is set. */
  activeIndex?: number;
  /** Navigate to a previous step (index < activeIndex). */
  onStepClick?: (index: number) => void;
};

/** Centered flow summary under modal tabs (e.g. pool withdraw › redeem). */
export function DepositModalFlowOverview({
  parts,
  activeIndex,
  onStepClick,
}: DepositModalFlowOverviewProps) {
  if (parts.length === 0) return null;

  const resolvedActive =
    activeIndex === undefined
      ? parts.length - 1
      : Math.min(Math.max(activeIndex, 0), parts.length - 1);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-b border-[#e2e8f0] pb-3 text-center text-sm font-semibold">
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
                className="rounded-md px-1.5 py-0.5 text-[#1E4775] underline decoration-[#1E4775]/35 underline-offset-2 transition hover:bg-[#1E4775]/8 hover:decoration-[#1E4775]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25"
              >
                {part}
              </button>
            ) : (
              <span
                className={
                  isActive
                    ? "text-[#64748b]"
                    : isPast
                      ? "text-[#1E4775]"
                      : "text-[#94a3b8]"
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
  );
}
