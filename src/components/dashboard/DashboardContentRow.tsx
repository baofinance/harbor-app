"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_INDEX_ROW_SHELL_CLASS,
  DASHBOARD_PANEL_ROW_SHELL_CLASS,
  DASHBOARD_SKELETON_BAR_CLASS,
} from "./dashboardRowListStyles";

/** Row shell shared by dashboard lists. */
export function DashboardContentRow({
  children,
  className = "",
  variant = "index",
}: {
  children: ReactNode;
  className?: string;
  /** `index` = white Anchor/Genesis row card; `glass` = frosted inset on dark sections. */
  variant?: "glass" | "index";
}) {
  const shellClass =
    variant === "index"
      ? DASHBOARD_INDEX_ROW_SHELL_CLASS
      : DASHBOARD_PANEL_ROW_SHELL_CLASS;

  return (
    <div className={`${shellClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function DashboardContentRowSkeleton({
  className = "",
  variant = "glass",
}: {
  className?: string;
  variant?: "glass" | "index";
}) {
  return (
    <DashboardContentRow className={className} variant={variant}>
      <div
        className={`${DASHBOARD_SKELETON_BAR_CLASS} ${
          variant === "index" ? "bg-[#1E4775]/10" : ""
        }`}
      />
    </DashboardContentRow>
  );
}
