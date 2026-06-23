"use client";

import { DASHBOARD_HERO_CHIP_PRIMARY_SHELL_EXTRA } from "./dashboardBrand";
import { DASHBOARD_STAT_CHIP_SHELL } from "./dashboardDensity";
import { DASHBOARD_STAT_CHIP_HOVER_CLASS } from "./dashboardInteraction";
import {
  DASHBOARD_NUMERIC_CHIP_CLASS,
  DASHBOARD_NUMERIC_CHIP_PRIMARY_CLASS,
} from "./dashboardTypography";

export const DASHBOARD_STAT_CHIP_LABEL_CLASS =
  "text-[10px] font-medium text-white/50";

export const DASHBOARD_STAT_CHIP_CONTEXT_CLASS =
  "text-[9px] font-normal normal-case tracking-normal text-white/40";

export type DashboardStatChipEmphasis = "primary" | "secondary" | "tertiary";

export type DashboardStatChipProps = {
  label: string;
  value: string;
  borderClass: string;
  valueClass?: string;
  context?: string;
  emphasis?: DashboardStatChipEmphasis;
};

function emphasisShellClass(emphasis: DashboardStatChipEmphasis): string {
  switch (emphasis) {
    case "primary":
      return DASHBOARD_HERO_CHIP_PRIMARY_SHELL_EXTRA;
    case "secondary":
      return "opacity-90";
    case "tertiary":
      return "opacity-80";
  }
}

function emphasisValueClass(emphasis: DashboardStatChipEmphasis, valueClass?: string): string {
  if (valueClass) return valueClass;
  switch (emphasis) {
    case "primary":
      return DASHBOARD_NUMERIC_CHIP_PRIMARY_CLASS;
    case "tertiary":
      return `${DASHBOARD_NUMERIC_CHIP_CLASS} text-white/80`;
    default:
      return DASHBOARD_NUMERIC_CHIP_CLASS;
  }
}

export function DashboardStatChip({
  label,
  value,
  borderClass,
  valueClass,
  context,
  emphasis = "secondary",
}: DashboardStatChipProps) {
  const valueClassName = emphasisValueClass(emphasis, valueClass);

  return (
    <div
      className={`${DASHBOARD_STAT_CHIP_SHELL} ${borderClass} ${emphasisShellClass(emphasis)} ${DASHBOARD_STAT_CHIP_HOVER_CLASS} ${
        emphasis === "primary" ? "order-first" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col">
        <span className={DASHBOARD_STAT_CHIP_LABEL_CLASS}>{label}</span>
        {context ? (
          <span className={DASHBOARD_STAT_CHIP_CONTEXT_CLASS}>{context}</span>
        ) : null}
      </div>
      <span className={`ml-2.5 ${valueClassName}`}>{value}</span>
    </div>
  );
}
