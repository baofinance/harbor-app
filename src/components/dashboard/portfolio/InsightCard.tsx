"use client";

import { PORTFOLIO_CARD_SHELL_DARK, PORTFOLIO_LABEL_CLASS, PORTFOLIO_MUTED_CLASS, PORTFOLIO_VALUE_CLASS } from "./portfolioStyles";

export type InsightCardProps = {
  label: string;
  value: string;
  subvalue?: string;
};

export function InsightCard({ label, value, subvalue }: InsightCardProps) {
  return (
    <div className={`${PORTFOLIO_CARD_SHELL_DARK} px-3 py-2.5 sm:px-3.5 sm:py-3`}>
      <p className={PORTFOLIO_LABEL_CLASS}>{label}</p>
      <p className={`mt-1 truncate ${PORTFOLIO_VALUE_CLASS}`} title={value}>
        {value}
      </p>
      {subvalue ? (
        <p className={`mt-0.5 ${PORTFOLIO_MUTED_CLASS} tabular-nums`}>{subvalue}</p>
      ) : null}
    </div>
  );
}
