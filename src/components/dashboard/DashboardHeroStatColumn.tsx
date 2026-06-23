"use client";

import {
  DASHBOARD_HERO_STAT_CONTEXT_CLASS,
  DASHBOARD_HERO_STAT_LABEL_CLASS,
  DASHBOARD_HERO_STAT_VALUE_CLASS,
} from "./dashboardStyles";

export type DashboardHeroStatColumnProps = {
  label: string;
  value: string;
  context?: string;
  valueClassName?: string;
};

export function DashboardHeroStatColumn({
  label,
  value,
  context,
  valueClassName,
}: DashboardHeroStatColumnProps) {
  return (
    <div className="min-w-0 space-y-1">
      <p className={DASHBOARD_HERO_STAT_LABEL_CLASS}>{label}</p>
      <p className={`${DASHBOARD_HERO_STAT_VALUE_CLASS} ${valueClassName ?? ""}`}>{value}</p>
      {context ? <p className={DASHBOARD_HERO_STAT_CONTEXT_CLASS}>{context}</p> : null}
    </div>
  );
}
