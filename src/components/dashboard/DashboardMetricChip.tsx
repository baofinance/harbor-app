"use client";

import type { ReactNode } from "react";
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
  icon?: ReactNode;
};

export function DashboardMetricChip({
  label,
  value,
  valueClassName = DASHBOARD_METRIC_CHIP_VALUE_CLASS,
  inline = false,
  icon,
}: DashboardMetricChipProps) {
  const shellClass = inline ? DASHBOARD_METRIC_CHIP_INLINE_CLASS : DASHBOARD_METRIC_CHIP_CLASS;

  if (icon) {
    return (
      <div
        className={`${shellClass} !flex-row !items-center !justify-start gap-2 !text-left md:!gap-1.5 lg:!gap-2`}
      >
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p
            className={`${DASHBOARD_METRIC_CHIP_LABEL_CLASS} ${
              inline ? "text-xs md:text-[11px] lg:text-xs xl:text-sm" : "text-sm"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-0.5 truncate font-mono tabular-nums font-semibold ${valueClassName} ${
              inline ? "text-sm md:text-xs lg:text-sm xl:text-base" : ""
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    );
  }

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
        className={`mt-1 w-full truncate font-mono tabular-nums font-semibold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}
