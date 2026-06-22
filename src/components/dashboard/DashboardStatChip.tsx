"use client";

import { MV_STAT_TILE } from "@/components/genesis/maidenVoyageLayoutStyles";

export const DASHBOARD_STAT_CHIP_SHELL = `${MV_STAT_TILE} shrink-0 border-l-[3px] px-3 py-2`;

export const DASHBOARD_STAT_CHIP_LABEL_CLASS = "text-xs font-medium text-white/70";

export const DASHBOARD_STAT_CHIP_VALUE_CLASS =
  "ml-2 font-mono text-sm font-semibold tabular-nums text-white/95";

export type DashboardStatChipProps = {
  label: string;
  value: string;
  borderClass: string;
  valueClass?: string;
};

export function DashboardStatChip({
  label,
  value,
  borderClass,
  valueClass = "text-white/95",
}: DashboardStatChipProps) {
  return (
    <div className={`${DASHBOARD_STAT_CHIP_SHELL} ${borderClass}`}>
      <span className={DASHBOARD_STAT_CHIP_LABEL_CLASS}>{label}</span>
      <span className={`${DASHBOARD_STAT_CHIP_VALUE_CLASS} ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
