"use client";

import type { ComponentType, ReactNode } from "react";
import { PORTFOLIO_CARD_SHELL_DARK, PORTFOLIO_LABEL_CLASS, PORTFOLIO_MUTED_CLASS, PORTFOLIO_VALUE_CLASS } from "./portfolioStyles";

export type PortfolioMetricCardProps = {
  title: string;
  valueUsd: number;
  positionCount: number;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  accentClass: string;
  isConnected: boolean;
  footer?: ReactNode;
};

function formatUsd(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function PortfolioMetricCard({
  title,
  valueUsd,
  positionCount,
  icon: Icon,
  iconClass,
  accentClass,
  isConnected,
  footer,
}: PortfolioMetricCardProps) {
  const countLabel =
    positionCount === 1 ? "1 position" : `${positionCount} positions`;

  return (
    <div className={`${PORTFOLIO_CARD_SHELL_DARK} ${accentClass} px-3 py-2.5 sm:px-3.5 sm:py-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={PORTFOLIO_LABEL_CLASS}>{title}</p>
          <p className={`mt-0.5 ${PORTFOLIO_VALUE_CLASS}`}>
            {isConnected ? formatUsd(valueUsd) : "—"}
          </p>
          <p className={`mt-0.5 ${PORTFOLIO_MUTED_CLASS}`}>
            {isConnected ? countLabel : "—"}
          </p>
        </div>
        <span className={iconClass} aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {footer ? <div className="mt-2 border-t border-white/[0.06] pt-2">{footer}</div> : null}
    </div>
  );
}
