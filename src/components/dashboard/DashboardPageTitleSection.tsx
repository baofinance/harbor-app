"use client";

import type { ReactNode } from "react";
import { DASHBOARD_PAGE_HEADER_CLASS, DASHBOARD_PAGE_HEADER_TITLE_CLASS } from "./dashboardStyles";

export type DashboardPageTitleSectionProps = {
  children?: ReactNode;
};

export function DashboardPageTitleSection({ children }: DashboardPageTitleSectionProps) {
  return (
    <div className={DASHBOARD_PAGE_HEADER_CLASS}>
      <h1 className={DASHBOARD_PAGE_HEADER_TITLE_CLASS}>Dashboard</h1>
      {children}
    </div>
  );
}
