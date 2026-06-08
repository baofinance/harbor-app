"use client";

import type { ReactNode } from "react";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";
import {
  DASHBOARD_PAGE_HEADER_CLASS,
  DASHBOARD_PAGE_HEADER_STATS_CLASS,
} from "./dashboardStyles";

export type DashboardPageTitleSectionProps = {
  stats?: ReactNode;
};

export function DashboardPageTitleSection({ stats }: DashboardPageTitleSectionProps) {
  return (
    <div className={DASHBOARD_PAGE_HEADER_CLASS}>
      <IndexPageTitleSection
        title="Dashboard"
        subtitle="Your positions and yield share"
      />
      {stats ? <div className={DASHBOARD_PAGE_HEADER_STATS_CLASS}>{stats}</div> : null}
    </div>
  );
}
