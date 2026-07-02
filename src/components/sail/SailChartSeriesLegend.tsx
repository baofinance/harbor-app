"use client";

import type { SailMarketChartConfig } from "@/utils/sailMarketChartSeries";
import {
  SAIL_CHART_BASELINE_COLOR,
  SAIL_CHART_HS_COLOR,
  SAIL_CHART_LEVERAGE_TOKEN_LABEL,
} from "@/components/sail/advanced/sailAdvancedStyles";

type SailChartSeriesLegendProps = {
  config: SailMarketChartConfig;
  comparePerformance: boolean;
  className?: string;
};

/** Compact series key for Sail chart — used in price header or above chart. */
export function SailChartSeriesLegend({
  config,
  comparePerformance,
  className = "",
}: SailChartSeriesLegendProps) {
  const items = comparePerformance
    ? [
        {
          label: `${config.defaultMetricLabel} (% chg)`,
          color: SAIL_CHART_BASELINE_COLOR,
        },
        {
          label: `${SAIL_CHART_LEVERAGE_TOKEN_LABEL} (% chg)`,
          color: SAIL_CHART_HS_COLOR,
        },
      ]
    : [
        {
          label: config.defaultMetricLabel,
          color: SAIL_CHART_BASELINE_COLOR,
        },
      ];

  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] leading-snug text-[#1E4775]/60 ${className}`}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
