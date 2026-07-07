"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_INDEX_TABLE_HEADER_WRAP_CLASS,
  DASHBOARD_TABLE_HEADER_WRAP_CLASS,
} from "./dashboardRowListStyles";

/** Column label row above dashboard list rows. */
export function DashboardListColumnHeader({
  children,
  scrollable = false,
  variant = "index",
}: {
  children: ReactNode;
  scrollable?: boolean;
  /** `index` = white Anchor/Genesis table header; `glass` = dark section inset. */
  variant?: "glass" | "index";
}) {
  const wrapClass =
    variant === "index"
      ? DASHBOARD_INDEX_TABLE_HEADER_WRAP_CLASS
      : DASHBOARD_TABLE_HEADER_WRAP_CLASS;

  return (
    <div className={wrapClass}>
      {scrollable ? <div className="overflow-x-auto">{children}</div> : children}
    </div>
  );
}
