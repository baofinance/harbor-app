"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_STATUS_PILL_ACTIVE_GLASS,
  DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  DASHBOARD_STATUS_PILL_CORAL_LIGHT,
  DASHBOARD_STATUS_PILL_ENDED_GLASS,
  DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  DASHBOARD_STATUS_PILL_MARKS_LIGHT,
  DASHBOARD_STATUS_PILL_NEUTRAL_GLASS,
  DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
  DASHBOARD_STATUS_PILL_STABILITY_GLASS,
  DASHBOARD_STATUS_PILL_STABILITY_LIGHT,
  DASHBOARD_STATUS_PILL_WALLET_LIGHT,
} from "../dashboardStyles";

export type StatusBadgeVariant =
  | "active"
  | "ended"
  | "neutral"
  | "coral"
  | "gold"
  | "purple"
  | "green";

const VARIANT_CLASS_LIGHT: Record<StatusBadgeVariant, string> = {
  active: DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  ended: DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  neutral: DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
  coral: DASHBOARD_STATUS_PILL_CORAL_LIGHT,
  gold:
    "inline-flex items-center rounded-md border border-[#F5D76E]/35 bg-[#F5D76E]/12 px-2 py-0.5 text-[10px] font-semibold text-[#B8922E] sm:text-xs",
  purple: DASHBOARD_STATUS_PILL_MARKS_LIGHT,
  green: DASHBOARD_STATUS_PILL_STABILITY_LIGHT,
};

const VARIANT_CLASS_DARK: Record<StatusBadgeVariant, string> = {
  active: DASHBOARD_STATUS_PILL_ACTIVE_GLASS,
  ended: DASHBOARD_STATUS_PILL_ENDED_GLASS,
  neutral: DASHBOARD_STATUS_PILL_NEUTRAL_GLASS,
  coral: DASHBOARD_STATUS_PILL_CORAL_LIGHT,
  gold:
    "inline-flex items-center rounded-md border border-[#F5D76E]/35 bg-[#F5D76E]/12 px-2 py-0.5 text-[10px] font-semibold text-[#F5D76E] sm:text-xs",
  purple:
    "inline-flex items-center rounded-md border border-[#C4B5FD]/35 bg-[#C4B5FD]/12 px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD] sm:text-xs",
  green: DASHBOARD_STATUS_PILL_STABILITY_GLASS,
};

/** Map status labels from useDashboardPositions — extend when new labels are added. */
function variantFromLabel(label: string, fallback: StatusBadgeVariant): StatusBadgeVariant {
  const normalized = label.trim().toLowerCase();
  switch (normalized) {
    case "wallet":
      return "neutral";
    case "stability":
      return "green";
    case "marks":
      return "purple";
    case "position":
      return "neutral";
    case "pending distribution":
      return "coral";
    case "ended":
      return "ended";
    default:
      return fallback;
  }
}

function classFromLabel(
  label: string,
  variant: StatusBadgeVariant,
  surface: "light" | "dark",
): string {
  if (surface === "dark") {
    return VARIANT_CLASS_DARK[variantFromLabel(label, variant)];
  }

  const normalized = label.trim().toLowerCase();
  switch (normalized) {
    case "wallet":
      return DASHBOARD_STATUS_PILL_WALLET_LIGHT;
    case "stability":
      return DASHBOARD_STATUS_PILL_STABILITY_LIGHT;
    case "marks":
      return DASHBOARD_STATUS_PILL_MARKS_LIGHT;
    case "position":
      return DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT;
    case "pending distribution":
      return DASHBOARD_STATUS_PILL_CORAL_LIGHT;
    default:
      return VARIANT_CLASS_LIGHT[variantFromLabel(label, variant)];
  }
}

export type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
  icon?: ReactNode;
  pulse?: boolean;
  /** `light` = white position rows; `dark` = glass inset panels. */
  surface?: "light" | "dark";
};

export function StatusBadge({
  label,
  variant = "neutral",
  icon,
  pulse = false,
  surface = "light",
}: StatusBadgeProps) {
  const resolvedVariant = variantFromLabel(label, variant);
  const className = classFromLabel(label, resolvedVariant, surface);

  return (
    <span className={`${className} gap-1`}>
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
