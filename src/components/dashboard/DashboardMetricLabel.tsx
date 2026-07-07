"use client";

import SimpleTooltip from "@/components/SimpleTooltip";
import { DASHBOARD_METRIC_LABEL_HOVER_CLASS } from "./dashboardInteraction";
import { PORTFOLIO_POSITION_LABEL_CLASS } from "./portfolio/portfolioStyles";

export type DashboardMetricLabelProps = {
  label: string;
  tip?: string;
  context?: string;
  /** Table header style — uppercase tracking on dark glass headers */
  variant?: "row" | "header";
  className?: string;
};

function TipAffordance() {
  return (
    <span className="shrink-0 normal-case text-[#1E4775]/35" aria-hidden>
      ⓘ
    </span>
  );
}

export function DashboardMetricLabel({
  label,
  tip,
  context,
  variant = "row",
  className = "",
}: DashboardMetricLabelProps) {
  const labelClass =
    variant === "row"
      ? PORTFOLIO_POSITION_LABEL_CLASS
      : "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

  const labelContent = tip ? (
    <SimpleTooltip label={tip} className="cursor-help">
      <span
        className={`inline-flex max-w-full items-center gap-0.5 ${DASHBOARD_METRIC_LABEL_HOVER_CLASS}`}
      >
        <span className="truncate">{label}</span>
        <TipAffordance />
      </span>
    </SimpleTooltip>
  ) : (
    <span className="truncate">{label}</span>
  );

  return (
    <div className={`min-w-0 space-y-0 ${className}`}>
      <p className={labelClass}>{labelContent}</p>
      {context ? (
        <p className="text-[9px] font-normal normal-case tracking-normal text-[#1E4775]/35">
          {context}
        </p>
      ) : null}
    </div>
  );
}

/** Header cell label with optional tooltip (dark glass table headers). */
export function DashboardMetricHeaderLabel({
  label,
  tip,
}: {
  label: string;
  tip?: string;
}) {
  if (!tip) {
    return <span>{label}</span>;
  }

  return (
    <SimpleTooltip label={tip} className="cursor-help">
      <span className="inline-flex max-w-full items-center gap-1">
        <span className="truncate">{label}</span>
        <span className="shrink-0 normal-case text-[#1E4775]/35">ⓘ</span>
      </span>
    </SimpleTooltip>
  );
}
