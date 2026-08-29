"use client";

import type { ReactNode } from "react";
import {
  DEPOSIT_BALANCE_STRIP_INNER_CLASS,
  DEPOSIT_SEGMENT_TRACK_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type DepositBalanceStripProps = {
  children: ReactNode;
  className?: string;
  /** Accessible label for screen readers (visible text stays centered). */
  ariaLabel?: string;
};

/** Full-width balance pill aligned with deposit segment toggles. */
export function DepositBalanceStrip({
  children,
  className = "",
  ariaLabel = "Wallet balance",
}: DepositBalanceStripProps) {
  return (
    <div className={`${DEPOSIT_SEGMENT_TRACK_CLASS} ${className}`.trim()}>
      <div
        className={DEPOSIT_BALANCE_STRIP_INNER_CLASS}
        role="status"
        aria-label={ariaLabel}
      >
        <span className="font-mono tabular-nums text-sm leading-tight">
          {children}
        </span>
      </div>
    </div>
  );
}
