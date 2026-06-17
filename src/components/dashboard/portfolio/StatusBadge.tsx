"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
} from "../dashboardStyles";

export type StatusBadgeVariant =
  | "active"
  | "ended"
  | "neutral"
  | "coral"
  | "gold"
  | "purple"
  | "green";

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  active: DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  ended: DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  neutral: DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
  coral:
    "inline-flex items-center rounded-md border border-[#FF8A7A]/35 bg-[#FF8A7A]/15 px-2 py-0.5 text-[10px] font-medium text-[#FF8A7A] sm:text-xs",
  gold:
    "inline-flex items-center rounded-md border border-[#F5D76E]/35 bg-[#F5D76E]/12 px-2 py-0.5 text-[10px] font-medium text-[#F5D76E] sm:text-xs",
  purple:
    "inline-flex items-center rounded-md border border-[#C4B5FD]/35 bg-[#C4B5FD]/12 px-2 py-0.5 text-[10px] font-medium text-[#C4B5FD] sm:text-xs",
  green:
    "inline-flex items-center rounded-md border border-[#B8EBD5]/35 bg-[#B8EBD5]/12 px-2 py-0.5 text-[10px] font-medium text-[#B8EBD5] sm:text-xs",
};

export type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
  icon?: ReactNode;
  pulse?: boolean;
};

export function StatusBadge({
  label,
  variant = "neutral",
  icon,
  pulse = false,
}: StatusBadgeProps) {
  return (
    <span className={`${VARIANT_CLASS[variant]} gap-1`}>
      {pulse ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current animate-pulse"
          aria-hidden
        />
      ) : null}
      {icon}
      {label}
    </span>
  );
}
