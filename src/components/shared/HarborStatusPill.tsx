"use client";

import type { ReactNode } from "react";
import {
  HARBOR_STATUS_PILL_ACTIVE_GLASS,
  HARBOR_STATUS_PILL_ACTIVE_LIGHT,
  HARBOR_STATUS_PILL_CORAL_LIGHT,
  HARBOR_STATUS_PILL_ENDED_GLASS,
  HARBOR_STATUS_PILL_ENDED_LIGHT,
  HARBOR_STATUS_PILL_GOLD_DARK,
  HARBOR_STATUS_PILL_GOLD_LIGHT,
  HARBOR_STATUS_PILL_MARKS_LIGHT,
  HARBOR_STATUS_PILL_NEUTRAL_GLASS,
  HARBOR_STATUS_PILL_NEUTRAL_LIGHT,
  HARBOR_STATUS_PILL_PURPLE_DARK,
  HARBOR_STATUS_PILL_STABILITY_GLASS,
  HARBOR_STATUS_PILL_STABILITY_LIGHT,
  HARBOR_STATUS_PILL_WALLET_LIGHT,
} from "./harborStatusPillStyles";

export type HarborStatusPillVariant =
  | "active"
  | "ended"
  | "neutral"
  | "coral"
  | "gold"
  | "purple"
  | "green";

const VARIANT_CLASS_LIGHT: Record<HarborStatusPillVariant, string> = {
  active: HARBOR_STATUS_PILL_ACTIVE_LIGHT,
  ended: HARBOR_STATUS_PILL_ENDED_LIGHT,
  neutral: HARBOR_STATUS_PILL_NEUTRAL_LIGHT,
  coral: HARBOR_STATUS_PILL_CORAL_LIGHT,
  gold: HARBOR_STATUS_PILL_GOLD_LIGHT,
  purple: HARBOR_STATUS_PILL_MARKS_LIGHT,
  green: HARBOR_STATUS_PILL_STABILITY_LIGHT,
};

const VARIANT_CLASS_DARK: Record<HarborStatusPillVariant, string> = {
  active: HARBOR_STATUS_PILL_ACTIVE_GLASS,
  ended: HARBOR_STATUS_PILL_ENDED_GLASS,
  neutral: HARBOR_STATUS_PILL_NEUTRAL_GLASS,
  coral: HARBOR_STATUS_PILL_CORAL_LIGHT,
  gold: HARBOR_STATUS_PILL_GOLD_DARK,
  purple: HARBOR_STATUS_PILL_PURPLE_DARK,
  green: HARBOR_STATUS_PILL_STABILITY_GLASS,
};

function variantFromLabel(label: string, fallback: HarborStatusPillVariant): HarborStatusPillVariant {
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
  variant: HarborStatusPillVariant,
  surface: "light" | "dark",
): string {
  if (surface === "dark") {
    return VARIANT_CLASS_DARK[variantFromLabel(label, variant)];
  }

  const normalized = label.trim().toLowerCase();
  switch (normalized) {
    case "wallet":
      return HARBOR_STATUS_PILL_WALLET_LIGHT;
    case "stability":
      return HARBOR_STATUS_PILL_STABILITY_LIGHT;
    case "marks":
      return HARBOR_STATUS_PILL_MARKS_LIGHT;
    case "position":
      return HARBOR_STATUS_PILL_NEUTRAL_LIGHT;
    case "pending distribution":
      return HARBOR_STATUS_PILL_CORAL_LIGHT;
    default:
      return VARIANT_CLASS_LIGHT[variantFromLabel(label, variant)];
  }
}

export type HarborStatusPillProps = {
  label: string;
  variant?: HarborStatusPillVariant;
  icon?: ReactNode;
  pulse?: boolean;
  surface?: "light" | "dark";
};

export function HarborStatusPill({
  label,
  variant = "neutral",
  icon,
  pulse = false,
  surface = "light",
}: HarborStatusPillProps) {
  const className = classFromLabel(label, variant, surface);

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
