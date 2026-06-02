"use client";

import React from "react";

/** Centered flow summary under modal tabs (e.g. pool withdraw › redeem). */
export function DepositModalFlowOverview({ parts }: { parts: string[] }) {
  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-b border-[#e2e8f0] pb-3 text-center text-sm font-semibold text-[#153B63]">
      {parts.map((part, index) => (
        <React.Fragment key={`${index}-${part}`}>
          {index > 0 ? (
            <span className="font-normal text-[#94a3b8]" aria-hidden>
              ›
            </span>
          ) : null}
          <span>{part}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
