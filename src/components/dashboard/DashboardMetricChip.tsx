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
  /** Compact chips for the section header row beside the title. */
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
          inline ? "text-xs sm:text-sm" : "text-sm"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 w-full truncate font-mono tabular-nums font-semibold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}
