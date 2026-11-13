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
import { CHART_BENCHMARK_SERIES_COLOR } from "@/components/charts/chartSeriesColors";
import type { SailMarketChartConfig, SailMarketChartPoint } from "@/utils/sailMarketChartSeries";
import {
  formatSailChartDefaultValue,
  formatSailChartPercentChange,
  formatSailChartUsdValue,
  toRechartsSailChartData,
  type SailMarketChartRechartsPoint,
} from "@/utils/sailMarketChartSeries";
import {
  snapSailChartEvents,
  type SailChartEvent,
  type SnappedSailChartEvent,
} from "@/utils/sailPriceRebase";
import {
  SAIL_CHART_BASELINE_COLOR,
  SAIL_CHART_HS_COLOR,
  SAIL_CHART_LEVERAGE_TOKEN_LABEL,
  SAIL_CHART_RECHARTS_LEGEND_FONT_SIZE,
  SAIL_CHART_RECHARTS_LEGEND_ICON_SIZE,
} from "@/components/sail/advanced/sailAdvancedStyles";

interface SailMarketMultiSeriesChartProps {
  data: SailMarketChartPoint[];
  config: SailMarketChartConfig;
  showHsPriceUsd: boolean;
  formatTimestamp: (timestamp: number) => string;
  formatTooltipTimestamp: (timestamp: number) => string;
  hideLegend?: boolean;
  events?: SailChartEvent[];
  /** 6M and 1Y put the two days close enough that horizontal names overlap. */
  verticalEventLabels?: boolean;
}

const SERIES_COLORS = {
  defaultRatio: SAIL_CHART_BASELINE_COLOR,
  hsPriceUsd: SAIL_CHART_HS_COLOR,
  perpReturnPct: CHART_BENCHMARK_SERIES_COLOR,
} as const;

function MultiSeriesTooltip({
  active,
  payload,
  label,
  formatTooltipTimestamp,
  config,
  comparePerformance,
  markedEvents,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SailMarketChartRechartsPoint }>;
  label?: number;
  formatTooltipTimestamp: (timestamp: number) => string;
  config: SailMarketChartConfig;
  comparePerformance: boolean;
  markedEvents: SnappedSailChartEvent[];
}) {
  if (!active || !payload?.length || label == null) return null;

  const row = payload[0]?.payload;
  if (!row) return null;
  const eventHere = markedEvents.find(
    (event) => event.pointTimestamp === row.timestamp,
  );

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
      label: `${SAIL_CHART_LEVERAGE_TOKEN_LABEL} (return)`,
      value: `${formatSailChartPercentChange(row.hsPriceUsd)} · ${formatSailChartUsdValue(hsAbs)}`,
      color: SERIES_COLORS.hsPriceUsd,
    });
    if (row.perpReturnPct != null) {
      items.push({
        label: "Hyperliquid comparison (return)",
        value: formatSailChartPercentChange(row.perpReturnPct),
        color: SERIES_COLORS.perpReturnPct,
      });
    }
  }

  return (
    <div className="rounded-lg bg-[#0c0c0c] p-3 shadow-lg">
      <p className="text-xs text-white/70">{formatTooltipTimestamp(label)}</p>
      {eventHere ? (
        <p
          className="mt-1 text-xs font-semibold"
          style={{ color: eventHere.tone === "incident" ? "#E7A07A" : "#7DCEA0" }}
        >
          {eventHere.label}
        </p>
      ) : null}
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

function SailChartEventLabel({
  viewBox,
  value,
  fill,
  vertical,
  side = "left",
}: {
  viewBox?: { x?: number; y?: number; width?: number };
  value?: string | number;
  fill?: string;
  vertical?: boolean;
  side?: "left" | "right";
}) {
  const label = value == null ? "" : String(value);
  if (!label || viewBox?.x == null || viewBox.y == null) return null;
  const x = viewBox.x + (viewBox.width ?? 0) / 2;
  const y = viewBox.y + 12;
  if (!vertical) {
    return (
      <text x={x} y={y} fill={fill} fontSize={11} fontWeight={600} textAnchor="middle">
        {label}
      </text>
    );
  }
  const anchorX = x + (side === "right" ? 16 : -4);
  return (
    <text
      x={anchorX}
      y={y}
      fill={fill}
      fontSize={11}
      fontWeight={600}
      textAnchor="end"
      transform={`rotate(-90, ${anchorX}, ${y})`}
    >
      {label}
    </text>
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
  hideLegend = false,
  events = [],
  verticalEventLabels = false,
}: SailMarketMultiSeriesChartProps) {
  const comparePerformance = showHsPriceUsd;
  const chartData = toRechartsSailChartData(data, comparePerformance);
  const markedEvents = snapSailChartEvents(data, events);
  const showPerpBenchmark =
    comparePerformance &&
    chartData.some((row) => row.perpReturnPct != null);

  const legendPayload = comparePerformance
    ? [
        {
          value: `${config.defaultMetricLabel} (% chg)`,
          type: "line" as const,
          color: SERIES_COLORS.defaultRatio,
        },
        {
          value: `${SAIL_CHART_LEVERAGE_TOKEN_LABEL} (% chg)`,
          type: "line" as const,
          color: SERIES_COLORS.hsPriceUsd,
        },
        ...(showPerpBenchmark
          ? [
              {
                value: "Hyperliquid comparison (% chg)",
                type: "line" as const,
                color: SERIES_COLORS.perpReturnPct,
              },
            ]
          : []),
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
          domain={["auto", "auto"]}
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
        {markedEvents.map((event) => (
          <ReferenceLine
            key={event.label}
            yAxisId="left"
            x={event.x}
            stroke={event.tone === "incident" ? "#E7A07A" : "#7DCEA0"}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
            label={{
              value: event.label,
              fill: event.tone === "incident" ? "#E7A07A" : "#7DCEA0",
              vertical: verticalEventLabels,
              side: event.tone === "incident" ? "left" : "right",
              content: SailChartEventLabel,
            }}
          />
        ))}
        <Tooltip
          content={
            <MultiSeriesTooltip
              formatTooltipTimestamp={formatTooltipTimestamp}
              config={config}
              comparePerformance={comparePerformance}
              markedEvents={markedEvents}
            />
          }
        />
        {legendPayload.length > 1 && !hideLegend ? (
          <Legend
            verticalAlign="top"
            align="left"
            iconType="circle"
            iconSize={SAIL_CHART_RECHARTS_LEGEND_ICON_SIZE}
            wrapperStyle={{
              fontSize: SAIL_CHART_RECHARTS_LEGEND_FONT_SIZE,
              paddingBottom: 4,
            }}
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
            name={`${SAIL_CHART_LEVERAGE_TOKEN_LABEL} (% chg)`}
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
        {showPerpBenchmark ? (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="perpReturnPct"
            name="Hyperliquid comparison (% chg)"
            stroke={SERIES_COLORS.perpReturnPct}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              fill: "#fff",
              stroke: SERIES_COLORS.perpReturnPct,
            }}
            connectNulls
            isAnimationActive={false}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
