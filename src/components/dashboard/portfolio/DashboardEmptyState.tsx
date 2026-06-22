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
  compact?: boolean;
  action?: ReactNode;
};

export function DashboardEmptyState({
  title,
  message,
  href,
  linkLabel,
  positionCount = 0,
  compact = false,
  action,
}: DashboardEmptyStateProps) {
  const showCount = positionCount > 0;
  const countLabel =
    positionCount === 1 ? "1 position" : `${positionCount} positions`;

  const shellClass = compact
    ? `${PORTFOLIO_CARD_SHELL_DARK} px-3.5 py-3 text-center sm:px-4`
    : `${PORTFOLIO_CARD_SHELL_DARK} px-4 py-4 text-center sm:px-5 sm:py-5`;

  return (
    <div className={shellClass}>
      <p className={`font-semibold text-white/90 ${compact ? "text-sm" : "text-sm"}`}>
        {title}
      </p>
      <p className={`mt-1.5 ${PORTFOLIO_MUTED_CLASS} ${compact ? "text-xs" : ""}`}>
        {message}
      </p>
      {showCount ? (
        <p className="mt-2 text-xs text-white/45">{countLabel}</p>
      ) : null}
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
