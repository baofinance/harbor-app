"use client";

import type { ReactNode } from "react";
import { DEPOSIT_BALANCE_STRIP_CLASS } from "@/components/deposit/depositFlowStyles";

export type DepositBalanceStripProps = {
  children: ReactNode;
  className?: string;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  /** When false, omit the visible "Balance:" prefix. */
  showLabel?: boolean;
};

/** Balance bar inside deposit / trade amount cards. */
export function DepositBalanceStrip({
  children,
  className = "",
  ariaLabel = "Wallet balance",
  showLabel = true,
}: DepositBalanceStripProps) {
  return (
    <div
      className={`block w-full ${DEPOSIT_BALANCE_STRIP_CLASS} ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
    >
      {showLabel ? (
        <span className="shrink-0 text-[#94a3b8]">Balance:</span>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="min-w-0 truncate text-right font-mono text-[10px] font-semibold tabular-nums leading-none text-[#1E4775]">
        {children}
      </span>
    </div>
  );
}
