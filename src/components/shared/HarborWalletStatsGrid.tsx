"use client";

import type { ReactNode } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
} from "@/components/sail/advanced/sailAdvancedStyles";

export const HARBOR_WALLET_STAT_CELL =
  "flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4";

export function formatHarborMarks(value: number): string {
  if (value <= 0) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

export function formatHarborMarksPerDay(value: number): string {
  if (value <= 0) return "0 marks/day";
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} marks/day`;
}

export function HarborWalletStatCell({
  label,
  value,
  valueClassName = SAIL_ADVANCED_HEADER_STRIP_VALUE,
  labelExtra,
}: {
  label: ReactNode;
  value: string;
  valueClassName?: string;
  labelExtra?: ReactNode;
}) {
  return (
    <div className={HARBOR_WALLET_STAT_CELL}>
      <span
        className={`${SAIL_ADVANCED_HEADER_STRIP_LABEL} inline-flex items-center justify-center gap-1`}
      >
        {label}
        {labelExtra}
      </span>
      <span className={valueClassName} title={value}>
        {value}
      </span>
    </div>
  );
}

export function HarborMarksInfo({
  loading,
  marksPerDay,
  explanation,
}: {
  loading: boolean;
  marksPerDay: number;
  explanation: string;
}) {
  return (
    <InfoTooltip
      label={
        <div className="space-y-2 text-left">
          <p className="text-sm font-semibold text-white">
            {loading ? "…" : formatHarborMarksPerDay(marksPerDay)}
          </p>
          <p className="text-xs leading-relaxed text-white/85">{explanation}</p>
        </div>
      }
      side="top"
    >
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#1E4775]/35 text-[9px] font-bold leading-none text-[#1E4775]/70"
        aria-hidden
      >
        i
      </span>
    </InfoTooltip>
  );
}

export function HarborWalletStatsGrid({
  ariaLabel,
  isConnected,
  columnsClass,
  embedded = false,
  className = "",
  children,
}: {
  ariaLabel: string;
  isConnected: boolean;
  columnsClass: string;
  embedded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const shell = embedded
    ? `grid w-full ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE}`
    : `${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid w-full ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE}`;

  if (!isConnected) {
    return (
      <div
        className={`${shell} grid-cols-1 ${className}`.trim()}
        aria-label={ariaLabel}
      >
        <SailConnectWalletStripNotice message="Connect your wallet to view portfolio stats." />
      </div>
    );
  }

  return (
    <div className={`${shell} ${columnsClass} ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
