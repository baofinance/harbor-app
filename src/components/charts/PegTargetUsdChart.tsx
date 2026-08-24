"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChainlinkUsdHistory } from "@/hooks/useChainlinkUsdHistory";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import {
  SAIL_CHART_TOGGLE_ACTIVE_CLASS,
  SAIL_CHART_TOGGLE_IDLE_CLASS,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { formatSailChartAxisTimestamp } from "@/utils/sailChartTimeRange";
import type { PegAssetKey } from "@/utils/sailMarketChartSeries";
import {
  computePegChartPeriodChanges,
  computePegChartRangeChangePct,
  filterPegChartPointsByRange,
  formatPegChartRangeChange,
  formatPegUsdPrice,
  liveUsdPriceForPegAsset,
  pegChangePctClassName,
  pegChartHistorySinceTimestamp,
  pegAssetDisplayLabel,
  PEG_TARGET_CHART_TIME_RANGES,
  type PegChartPeriodChanges,
  type PegTargetChartTimeRange,
} from "@/utils/pegAssetChart";

const CHART_GRADIENT_ID = "pegTargetUsdGradient";

type ChartRow = {
  timestamp: number;
  price: number;
};

function PegChartPeriodStats({ changes }: { changes: PegChartPeriodChanges }) {
  const items = [
    { label: "1h change", value: changes.change1hPct },
    { label: "24h change", value: changes.change24hPct },
    {
      label: "YTD change",
      value: changes.changeYtdPct,
      hint: "Since Jan 1 (UTC)",
    },
  ] as const;

  return (
    <div className="mt-3 grid shrink-0 grid-cols-3 gap-2 border-t border-[#1E4775]/10 pt-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[#1E4775]/10 bg-white/40 px-2.5 py-2 text-center"
          title={"hint" in item ? item.hint : undefined}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
            {item.label}
          </p>
          <p
            className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${pegChangePctClassName(item.value)}`}
          >
            {formatPegChartRangeChange(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function PegChartTooltip({
  active,
  payload,
  label,
  formatTooltipTimestamp,
  assetLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: number;
  formatTooltipTimestamp: (timestamp: number) => string;
  assetLabel: string;
}) {
  if (!active || !payload?.length || label == null) return null;
  const value = Number(payload[0]?.value);
  return (
    <div className="rounded-lg bg-[#0c0c0c] p-3 shadow-lg">
      <p className="text-xs text-white/70">{formatTooltipTimestamp(label)}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">
        {Number.isFinite(value)
          ? `$${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: assetLabel === "EUR" ? 4 : 2,
            })}`
          : "—"}
      </p>
      <p className="text-[10px] text-white/50">{assetLabel} / USD</p>
    </div>
  );
}

export type PegTargetUsdChartProps = {
  asset: PegAssetKey;
  className?: string;
};

/** Single-series peg asset vs USD chart (Chainlink round history + live spot). */
export function PegTargetUsdChart({ asset, className = "" }: PegTargetUsdChartProps) {
  const [timeRange, setTimeRange] = useState<PegTargetChartTimeRange>("1M");
  const pegTargetPrices = usePegTargetPrices();

  const historySinceTimestamp = useMemo(() => pegChartHistorySinceTimestamp(), []);

  const { priceHistory, isLoading } = useChainlinkUsdHistory(
    asset,
    asset !== "USD",
    historySinceTimestamp,
  );

  const filteredHistory = useMemo(
    () => filterPegChartPointsByRange(priceHistory, timeRange),
    [priceHistory, timeRange],
  );

  const chartData = useMemo<ChartRow[]>(
    () =>
      filteredHistory.map((point) => ({
        timestamp: point.timestamp,
        price: point.priceUsd,
      })),
    [filteredHistory],
  );

  const livePrice = liveUsdPriceForPegAsset(asset, pegTargetPrices);
  const assetLabel = pegAssetDisplayLabel(asset);
  const rangeChangePct = computePegChartRangeChangePct(filteredHistory);
  const periodChanges = useMemo(
    () => computePegChartPeriodChanges(priceHistory, livePrice),
    [priceHistory, livePrice],
  );

  const formatTimestamp = useMemo(
    () => (timestamp: number) => formatSailChartAxisTimestamp(timestamp, timeRange),
    [timeRange],
  );

  const formatTooltipTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  if (asset === "USD") {
    return (
      <div
        className={`flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 py-10 text-center ${className}`}
      >
        <p className="font-mono text-lg font-semibold tabular-nums text-[#1E4775]">
          $1.00
        </p>
        <p className="text-sm text-[#1E4775]/60">
          This market tracks USD. The peg reference is $1.00.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="mb-2 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[#1E4775]/10 pb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
            {assetLabel} / USD
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base">
            {formatPegUsdPrice(livePrice, asset)}
          </p>
        </div>
        {rangeChangePct != null ? (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
              {timeRange} change
            </p>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                rangeChangePct >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatPegChartRangeChange(rangeChangePct)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-[#1E4775]/45">Chainlink oracle history</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {PEG_TARGET_CHART_TIME_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                timeRange === range
                  ? SAIL_CHART_TOGGLE_ACTIVE_CLASS
                  : SAIL_CHART_TOGGLE_IDLE_CLASS
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 min-h-[14rem]">
        {isLoading ? (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-[#1E4775]/60">
            Loading price history…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-[#1E4775]/60">
            No Chainlink price data for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 12, bottom: 28, left: 8 }}
            >
              <defs>
                <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E4775" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1E4775" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="1 4"
                stroke="#1E4775"
                opacity={0.12}
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                stroke="#1E4775"
                opacity={0.5}
                tick={{ fontSize: 10, fill: "#1E4775", fontWeight: 500 }}
                tickLine={{ stroke: "#1E4775", opacity: 0.25 }}
                tickFormatter={formatTimestamp}
                angle={-45}
                textAnchor="end"
                height={44}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#1E4775"
                opacity={0.5}
                tick={{ fontSize: 10, fill: "#1E4775", fontWeight: 500 }}
                tickLine={{ stroke: "#1E4775", opacity: 0.25 }}
                domain={["auto", "auto"]}
                width={56}
                tickFormatter={(value) =>
                  `$${Number(value).toLocaleString(undefined, {
                    maximumFractionDigits: asset === "EUR" ? 4 : 0,
                  })}`
                }
              />
              <Tooltip
                content={
                  <PegChartTooltip
                    formatTooltipTimestamp={formatTooltipTimestamp}
                    assetLabel={assetLabel}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#1E4775"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${CHART_GRADIENT_ID})`}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#0c0c0c",
                  stroke: "#1E4775",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isLoading && priceHistory.length > 0 ? (
        <PegChartPeriodStats changes={periodChanges} />
      ) : null}
    </div>
  );
}
