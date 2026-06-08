"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_METRIC_STRIP_CLASS,
  DASHBOARD_METRIC_STRIP_INLINE_CLASS,
  DASHBOARD_METRIC_STRIP_SCROLL_CLASS,
} from "./dashboardStyles";

export function DashboardMetricStrip({
  children,
  inline = false,
  scroll = false,
}: {
  children: ReactNode;
  inline?: boolean;
  /** Horizontal scroll on narrow viewports (page-level stat strip). */
  scroll?: boolean;
}) {
  const className = scroll
    ? DASHBOARD_METRIC_STRIP_SCROLL_CLASS
    : inline
      ? DASHBOARD_METRIC_STRIP_INLINE_CLASS
      : DASHBOARD_METRIC_STRIP_CLASS;

  return <div className={className}>{children}</div>;
}
