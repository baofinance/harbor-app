"use client";

import React from "react";

export type StabilityPoolType = "collateral" | "sail";

interface StabilityPoolTypeBlockProps {
  value: StabilityPoolType;
  onChange: (t: StabilityPoolType) => void;
  disabled?: boolean;
  stabilityPoolAddress?: string | null;
  aprData?: unknown;
  stabilityPoolAPR: number;
  formatAPR: (n: number) => string;
  /** Optional wrapper class (e.g. pl-8 for indentation). */
  className?: string;
}

const EXPLAINER_COLLATERAL = (
  <>
    <span className="font-semibold">Collateral stability pool</span> converts
    anchor tokens to <span className="font-semibold">market collateral</span> at
    market rates when the market reaches its minimum collateral ratio.
  </>
);

const EXPLAINER_SAIL = (
  <>
    <span className="font-semibold">Sail stability pool</span> converts anchor
    tokens to <span className="font-semibold">Sail tokens</span> at market rates
    when the market reaches its minimum collateral ratio.
  </>
);

/**
 * Pool type toggle (Collateral / Sail), APR display, and explainer.
 * Used in Anchor deposit flow when selecting stability pool.
 */
export function StabilityPoolTypeBlock({
  value,
  onChange,
  disabled = false,
  stabilityPoolAddress,
  aprData,
  stabilityPoolAPR,
  formatAPR,
  className = "",
}: StabilityPoolTypeBlockProps) {
  const aprDisplay = stabilityPoolAddress
    ? aprData && Array.isArray(aprData) && aprData.length >= 2
      ? formatAPR(stabilityPoolAPR)
      : aprData === undefined
        ? "Loading..."
        : "-"
    : "-";

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#1E4775]/70">Pool type:</span>
        <div className="flex items-center bg-[#17395F]/10 p-1">
          <button
            type="button"
            onClick={() => onChange("collateral")}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              value === "collateral"
                ? "bg-[#1E4775] text-white shadow-sm"
                : "text-[#1E4775]/70 hover:text-[#1E4775]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Collateral
          </button>
          <button
            type="button"
            onClick={() => onChange("sail")}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              value === "sail"
                ? "bg-[#1E4775] text-white shadow-sm"
                : "text-[#1E4775]/70 hover:text-[#1E4775]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Sail
          </button>
        </div>
      </div>

      <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#1E4775]/70">Pool APR:</span>
          <span className="text-sm font-bold text-[#1E4775]">{aprDisplay}</span>
        </div>
      </div>

      <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
        <p className="text-xs text-[#1E4775]/80 leading-relaxed">
          {value === "collateral" ? EXPLAINER_COLLATERAL : EXPLAINER_SAIL}
        </p>
      </div>
    </div>
  );
}
