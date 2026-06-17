"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DASHBOARD_LINK_CLASS } from "../dashboardStyles";
import { PORTFOLIO_CARD_SHELL_DARK, PORTFOLIO_MUTED_CLASS } from "./portfolioStyles";

export type DashboardEmptyStateProps = {
  title: string;
  message: string;
  href?: string;
  linkLabel?: string;
  positionCount?: number;
  action?: ReactNode;
};

export function DashboardEmptyState({
  title,
  message,
  href,
  linkLabel,
  positionCount = 0,
  action,
}: DashboardEmptyStateProps) {
  const countLabel =
    positionCount === 1 ? "1 position" : `${positionCount} positions`;

  return (
    <div className={`${PORTFOLIO_CARD_SHELL_DARK} px-4 py-4 text-center sm:px-5 sm:py-5`}>
      <p className="text-sm font-semibold text-white/90">{title}</p>
      <p className={`mt-1.5 ${PORTFOLIO_MUTED_CLASS}`}>{message}</p>
      <p className="mt-2 text-xs text-white/45">{countLabel}</p>
      {href && linkLabel ? (
        <p className="mt-3">
          <Link href={href} className={DASHBOARD_LINK_CLASS}>
            {linkLabel}
          </Link>
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
