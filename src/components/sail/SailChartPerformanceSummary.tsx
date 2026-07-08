"use client";

import {
  SAIL_CHART_BASELINE_COLOR,
  SAIL_CHART_HS_COLOR,
  SAIL_CHART_LEVERAGE_TOKEN_LABEL,
} from "@/components/sail/advanced/sailAdvancedStyles";
import {
  formatSailChartPercentChange,
  type SailChartWindowPerformance,
} from "@/utils/sailMarketChartSeries";

type SailChartPerformanceSummaryProps = {
  performance: SailChartWindowPerformance;
  className?: string;
};

function performanceValueClass(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "text-[#1E4775]/75";
  }
  return value > 0 ? "text-harbor-mint" : "text-red-600";
}

function PerformanceRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[#1E4775]/60">
        {color ? (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={`shrink-0 font-mono text-[11px] font-semibold tabular-nums sm:text-xs ${performanceValueClass(value)}`}
      >
        {formatSailChartPercentChange(value)}
      </span>
    </div>
  );
}

/** Compact window performance stats beside the Sail chart price header. */
export function SailChartPerformanceSummary({
  performance,
  className = "",
}: SailChartPerformanceSummaryProps) {
  return (
    <div
      className={`min-w-[11rem] shrink-0 rounded-lg border border-[#1E4775]/10 bg-white/55 px-2.5 py-1.5 sm:min-w-[12.5rem] ${className}`}
    >
      <div className="space-y-1">
        <PerformanceRow
          label="Market"
          value={performance.marketPerformancePct}
          color={SAIL_CHART_BASELINE_COLOR}
        />
        <PerformanceRow
          label={SAIL_CHART_LEVERAGE_TOKEN_LABEL}
          value={performance.leverageTokenPerformancePct}
          color={SAIL_CHART_HS_COLOR}
        />
        <PerformanceRow
          label={`${SAIL_CHART_LEVERAGE_TOKEN_LABEL} vs market`}
          value={performance.leverageTokenVsMarketPct}
        />
      </div>
    </div>
  );
}
