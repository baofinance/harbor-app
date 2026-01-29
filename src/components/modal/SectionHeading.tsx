"use client";

import React from "react";

interface SectionHeadingProps {
  children: React.ReactNode;
  centered?: boolean;
  withBorder?: boolean;
}

/**
 * Section heading below tabs (e.g. "Deposit Collateral & Amount").
 * Matches Anchor withdraw style when centered; optional border.
 */
export function SectionHeading({
  children,
  centered = true,
  withBorder = false,
}: SectionHeadingProps) {
  return (
    <div
      className={`flex items-center justify-center text-xs text-[#1E4775]/50 pb-3 ${
        withBorder ? "border-b border-[#d1d7e5]" : ""
      }`}
    >
      <div className={`text-[#1E4775] font-semibold ${centered ? "text-center" : ""}`}>
        {children}
      </div>
    </div>
  );
}
