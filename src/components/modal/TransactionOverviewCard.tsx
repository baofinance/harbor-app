"use client";

import React from "react";

export interface OverviewRow {
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  className?: string;
  subValueClassName?: string;
  rowClassName?: string;
}

interface TransactionOverviewCardProps {
  label?: string;
  rows: OverviewRow[];
  conversionLine?: string;
  conversionLineAlign?: "left" | "right";
  feeLabel?: string;
  feeValue?: string;
  feeWarning?: boolean;
  prefix?: React.ReactNode;
}

/**
 * Transaction summary card. "You will receive", USD, conversion line, fee row.
 */
export function TransactionOverviewCard({
  label = "Transaction Overview",
  rows,
  conversionLine,
  conversionLineAlign = "right",
  feeLabel,
  feeValue,
  feeWarning = false,
  prefix,
}: TransactionOverviewCardProps) {
  return (
    <div className="space-y-2 mt-2">
      <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
        {label}
      </label>
      <div className="p-2.5 bg-[#17395F]/5 border border-[#1E4775]/10 space-y-2">
        {prefix ?? null}
        {rows.map((r, i) => (
          <div
            key={i}
            className={`flex justify-between items-center ${r.rowClassName ?? ""}`}
          >
            <span className="text-sm font-medium text-[#1E4775]/70">{r.label}</span>
            <div className={`text-right ${r.className ?? ""}`}>
              <div className="text-lg font-bold text-[#1E4775] font-mono">{r.value}</div>
              {r.subValue && (
                <div
                  className={`text-xs font-mono ${r.subValueClassName ?? "text-[#1E4775]/50"}`}
                >
                  {r.subValue}
                </div>
              )}
            </div>
          </div>
        ))}
        {conversionLine && (
          <div
            className={`text-xs text-[#1E4775]/50 italic ${conversionLineAlign === "right" ? "text-right" : ""}`}
          >
            {conversionLine}
          </div>
        )}
        {feeLabel != null && feeValue != null && (
          <div className="pt-2 border-t border-[#1E4775]/20">
            <div className="flex justify-end items-center gap-2 text-xs text-right">
              <span
                className={`font-bold font-mono ${feeWarning ? "text-red-600" : "text-[#1E4775]"}`}
              >
                {feeLabel} {feeValue}
                {feeWarning && " ⚠️"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
