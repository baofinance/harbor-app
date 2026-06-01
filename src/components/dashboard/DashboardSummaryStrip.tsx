"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_METRIC_STRIP_CLASS,
  DASHBOARD_METRIC_STRIP_INLINE_CLASS,
} from "./dashboardStyles";

export function DashboardMetricStrip({
  children,
  inline = false,
}: {
  children: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? DASHBOARD_METRIC_STRIP_INLINE_CLASS : DASHBOARD_METRIC_STRIP_CLASS}>
      {children}
    </div>
  );
}

/** Prevents accordion toggle when interacting with header stats. */
export function DashboardHeaderMetricsSlot({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-full min-w-0 justify-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
