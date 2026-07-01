"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SailMarketChartConfig, SailMarketChartPoint } from "@/utils/sailMarketChartSeries";
import {
  formatSailChartDefaultValue,
  formatSailChartUsdValue,
  toRechartsSailChartData,
} from "@/utils/sailMarketChartSeries";

interface SailMarketMultiSeriesChartProps {
  data: SailMarketChartPoint[];
  config: SailMarketChartConfig;
  showHsPriceUsd: boolean;
  formatTimestamp: (timestamp: number) => string;
  formatTooltipTimestamp: (timestamp: number) => string;
}

const SERIES_COLORS = {
  defaultRatio: "#1E4775",
  hsPriceUsd: "#6B5B95",
} as const;

function MultiSeriesTooltip({
  active,
  payload,
  label,
  formatTooltipTimestamp,
  config,
  showHsPriceUsd,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SailMarketChartPoint & { hsPriceUsd?: number | null } }>;
  label?: number;
  formatTooltipTimestamp: (timestamp: number) => string;
  config: SailMarketChartConfig;
  showHsPriceUsd: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const items: Array<{ label: string; value: string; color: string }> = [
    {
      label: config.defaultMetricLabel,
      value: formatSailChartDefaultValue(row.defaultRatio, config),
      color: SERIES_COLORS.defaultRatio,
    },
  ];

  if (showHsPriceUsd) {
    const hsValue = row.hsPriceUsd;
    items.push({
      label: `${config.hsSymbol} (USD)`,
      value: formatSailChartUsdValue(
        hsValue == null ? undefined : hsValue,
      ),
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

export function SailMarketMultiSeriesChart({
  data,
  config,
  showHsPriceUsd,
  formatTimestamp,
  formatTooltipTimestamp,
}: SailMarketMultiSeriesChartProps) {
  const chartData = toRechartsSailChartData(data);
  const showHsLine = showHsPriceUsd;

  const legendPayload = [
    {
      value: config.defaultMetricLabel,
      type: "line" as const,
      color: SERIES_COLORS.defaultRatio,
    },
    ...(showHsLine
      ? [{ value: `${config.hsSymbol} (USD)`, type: "line" as const, color: SERIES_COLORS.hsPriceUsd }]
      : []),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        key={showHsLine ? "dual-axis" : "single-axis"}
        data={chartData}
        margin={{ top: 8, right: showHsLine ? 56 : 15, bottom: 30, left: 8 }}
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
          opacity={0.6}
          tick={{ fontSize: 10, fill: "#1E4775", fontWeight: 500 }}
          tickLine={{ stroke: "#1E4775", opacity: 0.3 }}
          domain={["auto", "auto"]}
          width={56}
          tickFormatter={(v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return "";
            if (config.shortLabel === "USD") {
              return `$${n.toFixed(0)}`;
            }
            if (n < 0.001) return n.toExponential(1);
            if (n < 1) return n.toFixed(4);
            return n.toFixed(2);
          }}
        />
        {showHsLine ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={SERIES_COLORS.hsPriceUsd}
            opacity={0.75}
            tick={{ fontSize: 10, fill: SERIES_COLORS.hsPriceUsd, fontWeight: 500 }}
            tickLine={{ stroke: SERIES_COLORS.hsPriceUsd, opacity: 0.35 }}
            domain={["auto", "auto"]}
            width={52}
            tickFormatter={(v) => {
              const n = Number(v);
              if (!Number.isFinite(n)) return "";
              if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
              return `$${n.toFixed(0)}`;
            }}
          />
        ) : null}
        <Tooltip
          content={
            <MultiSeriesTooltip
              formatTooltipTimestamp={formatTooltipTimestamp}
              config={config}
              showHsPriceUsd={showHsPriceUsd}
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
          activeDot={{ r: 4, strokeWidth: 2, fill: "#0c0c0c", stroke: SERIES_COLORS.defaultRatio }}
          connectNulls
          isAnimationActive={false}
        />
        {showHsLine ? (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hsPriceUsd"
            name={`${config.hsSymbol} (USD)`}
            stroke={SERIES_COLORS.hsPriceUsd}
            strokeWidth={2.5}
            strokeDasharray="5 4"
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
