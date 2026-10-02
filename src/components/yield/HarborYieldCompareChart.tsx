"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HarborYieldMarket } from "@/config/harborYieldMarkets";
import { useChainlinkUsdHistory } from "@/hooks/useChainlinkUsdHistory";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import {
  SAIL_CHART_TOGGLE_ACTIVE_CLASS,
  SAIL_CHART_TOGGLE_IDLE_CLASS,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { formatSailChartAxisTimestamp } from "@/utils/sailChartTimeRange";
import {
  computePegChartPeriodChanges,
  computePegChartRangeChangePct,
  filterPegChartPointsByRange,
  formatPegChartRangeChange,
  formatPegUsdPrice,
  liveUsdPriceForPegAsset,
  pegChangePctClassName,
  pegChartFetchSinceTimestamp,
  PEG_TARGET_CHART_TIME_RANGES,
  startOfYearTimestamp,
  type PegPricePoint,
  type PegTargetChartTimeRange,
} from "@/utils/pegAssetChart";

const MIN_CHART_POINTS = 2;
const HA_COLOR = "#1E4775";
const HY_COLOR = "#1f8a68";

type ChartRow = {
  timestamp: number;
  ha: number;
  hy: number;
};

function usdPegHistory(sinceSec: number, nowSec: number): PegPricePoint[] {
  const step = 6 * 60 * 60;
  const points: PegPricePoint[] = [];
  for (let timestamp = sinceSec; timestamp <= nowSec; timestamp += step) {
    points.push({ timestamp, priceUsd: 1 });
  }
  const last = points[points.length - 1];
  if (!last || last.timestamp !== nowSec) {
    points.push({ timestamp: nowSec, priceUsd: 1 });
  }
  return points;
}

function CompareTooltip({
  active,
  payload,
  label,
  haSymbol,
  hySymbol,
  asset,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: number;
  haSymbol: string;
  hySymbol: string;
  asset: HarborYieldMarket["asset"];
}) {
  if (!active || !payload?.length || label == null) return null;
  const date = new Date(label * 1000);
  const when = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  const ha = payload.find((item) => item.dataKey === "ha")?.value;
  const hy = payload.find((item) => item.dataKey === "hy")?.value;

  return (
    <div className="rounded-lg bg-[#0c0c0c] p-3 shadow-lg">
      <p className="text-xs text-white/70">{when}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">
        {haSymbol} {formatPegUsdPrice(typeof ha === "number" ? ha : null, asset)}
      </p>
      <p className="font-mono text-sm font-semibold text-[#8fd9c0]">
        {hySymbol} {formatPegUsdPrice(typeof hy === "number" ? hy : null, asset)}
      </p>
    </div>
  );
}

export function HarborYieldCompareChart({
  market,
}: {
  market: HarborYieldMarket;
}) {
  const [timeRange, setTimeRange] = useState<PegTargetChartTimeRange>("1W");
  const pegTargetPrices = usePegTargetPrices();
  const gradientId = `hyCompare-${market.id}`;

  useEffect(() => {
    setTimeRange("1W");
  }, [market.id]);

  const chartSinceTimestamp = useMemo(
    () => pegChartFetchSinceTimestamp(timeRange),
    [timeRange],
  );
  const ytdSinceTimestamp = useMemo(() => startOfYearTimestamp(), []);
  const needsSeparateYtdFetch = ytdSinceTimestamp < chartSinceTimestamp;
  const isUsd = market.asset === "USD";

  const { priceHistory, isLoading } = useChainlinkUsdHistory(
    market.asset,
    !isUsd,
    chartSinceTimestamp,
  );
  const { priceHistory: ytdHistory, isLoading: isYtdLoading } =
    useChainlinkUsdHistory(
      market.asset,
      !isUsd && needsSeparateYtdFetch,
      ytdSinceTimestamp,
    );

  const nowSec = Math.floor(Date.now() / 1000);
  const sourceHistory = isUsd
    ? usdPegHistory(Math.min(chartSinceTimestamp, ytdSinceTimestamp), nowSec)
    : priceHistory;
  const statsHistory = isUsd
    ? sourceHistory
    : needsSeparateYtdFetch && ytdHistory.length > 0
      ? ytdHistory
      : priceHistory;

  const filteredHistory = useMemo(
    () => filterPegChartPointsByRange(sourceHistory, timeRange),
    [sourceHistory, timeRange],
  );

  const chartData = useMemo<ChartRow[]>(
    () =>
      filteredHistory.map((point) => ({
        timestamp: point.timestamp,
        ha: point.priceUsd,
        hy: point.priceUsd * market.sharePriceInPeg,
      })),
    [filteredHistory, market.sharePriceInPeg],
  );

  const liveHa = liveUsdPriceForPegAsset(market.asset, pegTargetPrices);
  const liveHy =
    liveHa != null && Number.isFinite(liveHa)
      ? liveHa * market.sharePriceInPeg
      : null;

  const oneDayPointCount = useMemo(
    () => filterPegChartPointsByRange(sourceHistory, "1D").length,
    [sourceHistory],
  );
  const isOneDayDisabled = !isUsd && !isLoading && oneDayPointCount < MIN_CHART_POINTS;

  useEffect(() => {
    if (isOneDayDisabled && timeRange === "1D") setTimeRange("1W");
  }, [isOneDayDisabled, timeRange]);

  const hyStatsHistory = useMemo(
    () =>
      statsHistory.map((point) => ({
        timestamp: point.timestamp,
        priceUsd: point.priceUsd * market.sharePriceInPeg,
      })),
    [statsHistory, market.sharePriceInPeg],
  );
  const hyFilteredHistory = useMemo(
    () =>
      filteredHistory.map((point) => ({
        priceUsd: point.priceUsd * market.sharePriceInPeg,
      })),
    [filteredHistory, market.sharePriceInPeg],
  );

  const rangeChangePct = computePegChartRangeChangePct(hyFilteredHistory);
  const periodChanges = useMemo(
    () => computePegChartPeriodChanges(hyStatsHistory, liveHy),
    [hyStatsHistory, liveHy],
  );

  const formatTimestamp = useMemo(
    () => (timestamp: number) => formatSailChartAxisTimestamp(timestamp, timeRange),
    [timeRange],
  );

  const showChart = isUsd || (!isLoading && chartData.length > 0);
  const loading = !isUsd && isLoading;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[#1E4775]/10 pb-2">
        <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-1">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
              {market.haSymbol}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base">
              {formatPegUsdPrice(liveHa, market.asset)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#1f8a68]">
              {market.symbol}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-[#1f8a68] sm:text-base">
              {formatPegUsdPrice(liveHy, market.asset)}
            </p>
          </div>
        </div>
        {rangeChangePct != null ? (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
              {timeRange} {market.symbol}
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
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#1E4775]/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-[#1E4775]" aria-hidden />
            {market.haSymbol}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full border-t-2 border-dashed border-[#1f8a68]"
              aria-hidden
            />
            {market.symbol}
          </span>
          <span className="text-[#1E4775]/45">
            {isUsd ? "USD peg is $1.00" : "Chainlink oracle history"}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {PEG_TARGET_CHART_TIME_RANGES.map((range) => {
            const disabled = range === "1D" && isOneDayDisabled;
            return (
              <button
                key={range}
                type="button"
                disabled={disabled}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  timeRange === range && !disabled
                    ? SAIL_CHART_TOGGLE_ACTIVE_CLASS
                    : SAIL_CHART_TOGGLE_IDLE_CLASS
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 min-h-[14rem]">
        {loading ? (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-[#1E4775]/60">
            Loading price history…
          </div>
        ) : !showChart ? (
          <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-[#1E4775]/60">
            No price history for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 12, bottom: 28, left: 8 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={HA_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={HA_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="1 4"
                stroke={HA_COLOR}
                opacity={0.12}
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                stroke={HA_COLOR}
                opacity={0.5}
                tick={{ fontSize: 10, fill: HA_COLOR, fontWeight: 500 }}
                tickLine={{ stroke: HA_COLOR, opacity: 0.25 }}
                tickFormatter={formatTimestamp}
                angle={-45}
                textAnchor="end"
                height={44}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={HA_COLOR}
                opacity={0.5}
                tick={{ fontSize: 10, fill: HA_COLOR, fontWeight: 500 }}
                tickLine={{ stroke: HA_COLOR, opacity: 0.25 }}
                domain={["auto", "auto"]}
                width={64}
                tickFormatter={(value) =>
                  isUsd
                    ? `$${Number(value).toFixed(2)}`
                    : `$${Number(value).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}`
                }
              />
              <Tooltip
                content={
                  <CompareTooltip
                    haSymbol={market.haSymbol}
                    hySymbol={market.symbol}
                    asset={market.asset}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="ha"
                stroke={HA_COLOR}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: "#0c0c0c", stroke: HA_COLOR }}
              />
              <Line
                type="monotone"
                dataKey="hy"
                stroke={HY_COLOR}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: "#0c0c0c", stroke: HY_COLOR }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {showChart ? (
        <div className="mt-3 grid shrink-0 grid-cols-3 gap-2 border-t border-[#1E4775]/10 pt-3">
          {(
            [
              { label: `1h ${market.symbol}`, value: periodChanges.change1hPct },
              { label: `24h ${market.symbol}`, value: periodChanges.change24hPct },
              {
                label: `YTD ${market.symbol}`,
                value: !isUsd && needsSeparateYtdFetch && isYtdLoading
                  ? null
                  : periodChanges.changeYtdPct,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[#1E4775]/10 bg-white/40 px-2.5 py-2 text-center"
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
      ) : null}
      <p className="mt-2 text-center text-[11px] leading-snug text-[#1E4775]/55">
        {market.symbol} is {market.sharePriceInPeg.toFixed(2)} {market.pegSymbol} per
        share until the vault is live, so it matches {market.haSymbol}.
      </p>
    </div>
  );
}
