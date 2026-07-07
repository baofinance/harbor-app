"use client";

import type { ReactNode } from "react";

type AnchorDepositFeeFooterProps = {
  children: ReactNode;
};

/** Muted single-line fee row for Anchor deposit footer. */
export function AnchorDepositFeeFooter({ children }: AnchorDepositFeeFooterProps) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10px] leading-snug text-[#1E4775]/55">
      {children}
    </p>
  );
}
