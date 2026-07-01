"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SailMarketChartConfig, SailMarketChartPoint } from "@/utils/sailMarketChartSeries";
import {
  formatSailChartDefaultValue,
  formatSailChartPercentChange,
  formatSailChartUsdValue,
  toRechartsSailChartData,
  type SailMarketChartRechartsPoint,
} from "@/utils/sailMarketChartSeries";
import {
  SAIL_CHART_BASELINE_COLOR,
  SAIL_CHART_HS_COLOR,
} from "@/components/sail/advanced/sailAdvancedStyles";

interface SailMarketMultiSeriesChartProps {
  data: SailMarketChartPoint[];
  config: SailMarketChartConfig;
  showHsPriceUsd: boolean;
  formatTimestamp: (timestamp: number) => string;
  formatTooltipTimestamp: (timestamp: number) => string;
}

const SERIES_COLORS = {
  defaultRatio: SAIL_CHART_BASELINE_COLOR,
  hsPriceUsd: SAIL_CHART_HS_COLOR,
} as const;

function MultiSeriesTooltip({
  active,
  payload,
  label,
  formatTooltipTimestamp,
  config,
  comparePerformance,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SailMarketChartRechartsPoint }>;
  label?: number;
  formatTooltipTimestamp: (timestamp: number) => string;
  config: SailMarketChartConfig;
  comparePerformance: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const baseAbs = row.defaultRatioAbs ?? row.defaultRatio;
  const hsAbs = row.hsPriceUsdAbs ?? row.hsPriceUsd;

  const items: Array<{ label: string; value: string; color: string }> = [
    {
      label: comparePerformance
        ? `${config.defaultMetricLabel} (return)`
        : config.defaultMetricLabel,
      value: comparePerformance
        ? `${formatSailChartPercentChange(row.defaultRatio)} · ${formatSailChartDefaultValue(baseAbs, config)}`
        : formatSailChartDefaultValue(baseAbs, config),
      color: SERIES_COLORS.defaultRatio,
    },
  ];

  if (comparePerformance) {
    items.push({
      label: `${config.hsSymbol} (return)`,
      value: `${formatSailChartPercentChange(row.hsPriceUsd)} · ${formatSailChartUsdValue(hsAbs)}`,
      color: SERIES_COLORS.hsPriceUsd,
    });
  }

  return (
    <div className="rounded-lg bg-[#0c0c0c] p-3 shadow-lg">
      <p className="text-xs text-white/70">{formatTooltipTimestamp(label)}</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-white/80">{item.label}:</span>
            <span className="font-mono font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAbsoluteAxisTick(value: number, config: SailMarketChartConfig): string {
  if (!Number.isFinite(value)) return "";
  if (config.shortLabel === "USD") {
    return `$${value.toFixed(0)}`;
  }
  if (value < 0.001) return value.toExponential(1);
  if (value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

export function SailMarketMultiSeriesChart({
  data,
  config,
  showHsPriceUsd,
  formatTimestamp,
  formatTooltipTimestamp,
}: SailMarketMultiSeriesChartProps) {
  const comparePerformance = showHsPriceUsd;
  const chartData = toRechartsSailChartData(data, comparePerformance);

  const legendPayload = comparePerformance
    ? [
        {
          value: `${config.defaultMetricLabel} (% chg)`,
          type: "line" as const,
          color: SERIES_COLORS.defaultRatio,
        },
        {
          value: `${config.hsSymbol} (% chg)`,
          type: "line" as const,
          color: SERIES_COLORS.hsPriceUsd,
        },
      ]
    : [
        {
          value: config.defaultMetricLabel,
          type: "line" as const,
          color: SERIES_COLORS.defaultRatio,
        },
      ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        key={comparePerformance ? "performance-compare" : "absolute-rate"}
        data={chartData}
        margin={{ top: 8, right: 15, bottom: 30, left: 8 }}
      >
        <defs>
          <linearGradient id="sailDefaultGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES_COLORS.defaultRatio} stopOpacity={0.35} />
            <stop offset="95%" stopColor={SERIES_COLORS.defaultRatio} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="1 4" stroke="#1E4775" opacity={0.15} vertical={false} />
        <XAxis
          dataKey="timestamp"
          stroke="#1E4775"
          opacity={0.5}
          tick={{ fontSize: 11, fill: "#1E4775", fontWeight: 500 }}
          tickLine={{ stroke: "#1E4775", opacity: 0.3 }}
          tickFormatter={formatTimestamp}
          angle={-45}
          textAnchor="end"
          height={50}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          stroke={SERIES_COLORS.defaultRatio}
          opacity={0.75}
          tick={{
            fontSize: 10,
            fill: comparePerformance ? SERIES_COLORS.defaultRatio : "#1E4775",
            fontWeight: 500,
          }}
          tickLine={{
            stroke: comparePerformance ? SERIES_COLORS.defaultRatio : "#1E4775",
            opacity: 0.35,
          }}
          domain={comparePerformance ? ["auto", "auto"] : ["auto", "auto"]}
          width={56}
          tickFormatter={(v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return "";
            return comparePerformance
              ? formatSailChartPercentChange(n)
              : formatAbsoluteAxisTick(n, config);
          }}
        />
        {comparePerformance ? (
          <ReferenceLine
            yAxisId="left"
            y={0}
            stroke={SERIES_COLORS.defaultRatio}
            strokeDasharray="3 3"
            opacity={0.25}
          />
        ) : null}
        <Tooltip
          content={
            <MultiSeriesTooltip
              formatTooltipTimestamp={formatTooltipTimestamp}
              config={config}
              comparePerformance={comparePerformance}
            />
          }
        />
        {legendPayload.length > 1 ? (
          <Legend
            verticalAlign="top"
            align="left"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
            payload={legendPayload}
          />
        ) : null}
        {comparePerformance ? (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="defaultRatio"
            name={`${config.defaultMetricLabel} (% chg)`}
            stroke={SERIES_COLORS.defaultRatio}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              fill: "#fff",
              stroke: SERIES_COLORS.defaultRatio,
            }}
            connectNulls
            isAnimationActive={false}
          />
        ) : (
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="defaultRatio"
            name={config.defaultMetricLabel}
            stroke={SERIES_COLORS.defaultRatio}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sailDefaultGradient)"
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              fill: "#0c0c0c",
              stroke: SERIES_COLORS.defaultRatio,
            }}
            connectNulls
            isAnimationActive={false}
          />
        )}
        {comparePerformance ? (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="hsPriceUsd"
            name={`${config.hsSymbol} (% chg)`}
            stroke={SERIES_COLORS.hsPriceUsd}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              fill: "#fff",
              stroke: SERIES_COLORS.hsPriceUsd,
            }}
            connectNulls
            isAnimationActive={false}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
