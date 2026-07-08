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
  marketPairLabel: string;
  className?: string;
};

function performanceValueClass(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "text-[#1E4775]/75";
  }
  return value > 0 ? "text-harbor-mint" : "text-red-600";
}

function PerformanceStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
      {color ? (
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span className="text-[#1E4775]/60">{label}</span>
      <span
        className={`font-mono font-semibold tabular-nums ${performanceValueClass(value)}`}
      >
        {formatSailChartPercentChange(value)}
      </span>
    </span>
  );
}

/** Compact window performance stats beside the Sail chart price header. */
export function SailChartPerformanceSummary({
  performance,
  marketPairLabel,
  className = "",
}: SailChartPerformanceSummaryProps) {
  return (
    <div
      className={`shrink-0 rounded-lg border border-[#1E4775]/10 bg-white/55 px-2.5 py-1.5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:flex-nowrap sm:text-[11px]">
        <PerformanceStat
          label={marketPairLabel}
          value={performance.marketPerformancePct}
          color={SAIL_CHART_BASELINE_COLOR}
        />
        <PerformanceStat
          label={SAIL_CHART_LEVERAGE_TOKEN_LABEL}
          value={performance.leverageTokenPerformancePct}
          color={SAIL_CHART_HS_COLOR}
        />
        <PerformanceStat
          label={`${SAIL_CHART_LEVERAGE_TOKEN_LABEL} vs ${marketPairLabel}`}
          value={performance.leverageTokenVsMarketPct}
        />
      </div>
    </div>
  );
}
