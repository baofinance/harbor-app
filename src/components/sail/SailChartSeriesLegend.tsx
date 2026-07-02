"use client";

import type { SailMarketChartConfig } from "@/utils/sailMarketChartSeries";
import {
  SAIL_CHART_BASELINE_COLOR,
  SAIL_CHART_HS_COLOR,
  SAIL_CHART_LEVERAGE_TOKEN_LABEL,
  SAIL_CHART_LEGEND_CLASS,
  SAIL_CHART_LEGEND_DOT_CLASS,
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
    <div className={`${SAIL_CHART_LEGEND_CLASS} ${className}`}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={SAIL_CHART_LEGEND_DOT_CLASS}
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
