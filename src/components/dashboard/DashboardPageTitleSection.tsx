"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_PAGE_HEADER_CLASS,
  DASHBOARD_PAGE_HEADER_STATS_CLASS,
  DASHBOARD_PAGE_HEADER_SUBTITLE_CLASS,
  DASHBOARD_PAGE_HEADER_TITLE_CLASS,
} from "./dashboardStyles";

export type DashboardPageTitleSectionProps = {
  stats?: ReactNode;
};

export function DashboardPageTitleSection({ stats }: DashboardPageTitleSectionProps) {
  return (
    <div className={DASHBOARD_PAGE_HEADER_CLASS}>
      <div className="min-w-0 shrink-0 text-left">
        <h1 className={DASHBOARD_PAGE_HEADER_TITLE_CLASS}>Dashboard</h1>
        <p className={DASHBOARD_PAGE_HEADER_SUBTITLE_CLASS}>
          Your positions and yield share
        </p>
      </div>
      {stats ? <div className={DASHBOARD_PAGE_HEADER_STATS_CLASS}>{stats}</div> : null}
    </div>
  );
}
