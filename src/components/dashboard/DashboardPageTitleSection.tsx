"use client";

import type { ReactNode } from "react";
import { WalletIcon } from "@heroicons/react/24/outline";
import { DASHBOARD_PAGE_HEADER_CLASS, DASHBOARD_PAGE_HEADER_STATS_CLASS } from "./dashboardStyles";

export type DashboardPageTitleSectionProps = {
  stats?: ReactNode;
};

export function DashboardPageTitleSection({ stats }: DashboardPageTitleSectionProps) {
  return (
    <div className={DASHBOARD_PAGE_HEADER_CLASS}>
      <header className="flex shrink-0 items-center gap-2">
        <WalletIcon className="h-5 w-5 text-[#FF8A7A]" aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/85">
          Dashboard
        </span>
      </header>
      {stats ? <div className={DASHBOARD_PAGE_HEADER_STATS_CLASS}>{stats}</div> : null}
    </div>
  );
}
