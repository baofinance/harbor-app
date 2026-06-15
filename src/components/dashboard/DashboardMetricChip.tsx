"use client";

import {
  DASHBOARD_METRIC_CHIP_CLASS,
  DASHBOARD_METRIC_CHIP_INLINE_CLASS,
  DASHBOARD_METRIC_CHIP_LABEL_CLASS,
  DASHBOARD_METRIC_CHIP_VALUE_CLASS,
} from "./dashboardStyles";

export type DashboardMetricChipProps = {
  label: string;
  value: string;
  valueClassName?: string;
  /** Compact chips for the page-level stat strip. */
  inline?: boolean;
};

export function DashboardMetricChip({
  label,
  value,
  valueClassName = DASHBOARD_METRIC_CHIP_VALUE_CLASS,
  inline = false,
}: DashboardMetricChipProps) {
  const shellClass = inline ? DASHBOARD_METRIC_CHIP_INLINE_CLASS : DASHBOARD_METRIC_CHIP_CLASS;

  return (
    <div className={shellClass}>
      <p
        className={`w-full ${DASHBOARD_METRIC_CHIP_LABEL_CLASS} ${
          inline ? "text-xs md:text-[11px] lg:text-xs xl:text-sm" : "text-sm"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 w-full truncate font-mono tabular-nums font-semibold ${valueClassName} ${
          inline ? "text-sm md:text-xs lg:text-sm xl:text-base" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
