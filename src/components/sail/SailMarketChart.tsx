"use client";

import { useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import { markets } from "@/config/markets";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import { useChainlinkUsdHistory } from "@/hooks/useChainlinkUsdHistory";
import { mergeChartData, useSailPriceHistory } from "@/hooks/useSailPriceHistory";
import {
  buildSailMarketChartPoints,
  computeLiveDefaultRatio,
  getSailMarketChartConfig,
  type SailMarketChartConfig,
  type SailMarketChartPoint,
} from "@/utils/sailMarketChartSeries";
import {
  SailMarketMultiSeriesChart,
} from "./SailMarketMultiSeriesChart";

export type SailMarketChartProps = {
  marketId: string;
  market: DefinedMarket;
  onLiveDefaultRatioChange?: (value: number | null) => void;
  onConfigReady?: (config: SailMarketChartConfig) => void;
};

type TimeRange = "1D" | "1W" | "1M";

function filterByTimeRange(
  points: SailMarketChartPoint[],
  timeRange: TimeRange
): SailMarketChartPoint[] {
  if (points.length === 0) return [];
  if (timeRange === "1M") return points;

  const end = points.reduce((max, p) => (p.timestamp > max ? p.timestamp : max), 0);
  if (end <= 0) return points;

  const start =
    timeRange === "1D"
      ? end - 24 * 60 * 60
      : end - 7 * 24 * 60 * 60;

  return points.filter((p) => p.timestamp >= start);
}

function OverlayToggle({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-[#1E4775]/25 bg-[#1E4775]/10 text-[#1E4775]"
          : "border-[#1E4775]/15 bg-white/60 text-[#1E4775]/55 hover:bg-[#1E4775]/5"
      }`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: active ? color : "#cbd5e1" }}
      />
      {label}
    </button>
  );
}

export function SailMarketChart({
  marketId,
  market,
  onLiveDefaultRatioChange,
  onConfigReady,
}: SailMarketChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [showHsPriceUsd, setShowHsPriceUsd] = useState(false);

  const config = useMemo(() => getSailMarketChartConfig(market), [market]);
  const pegTargetPrices = usePegTargetPrices();

  const leveragedTokenAddress = markets[marketId]?.addresses?.leveragedToken as
    | string
    | undefined;

  const longNeedsChainlink = config.longPegAsset !== "USD";
  const shortNeedsChainlink = config.shortPegAsset !== "USD";

  const { priceHistory: longChainlinkHistory, isLoading: isLongChainlinkLoading } =
    useChainlinkUsdHistory(
      longNeedsChainlink ? config.longPegAsset : null,
      longNeedsChainlink
    );

  const { priceHistory: shortChainlinkHistory, isLoading: isShortChainlinkLoading } =
    useChainlinkUsdHistory(
      shortNeedsChainlink ? config.shortPegAsset : null,
      shortNeedsChainlink
    );

  const chainlinkHistories = useMemo(
    () => ({
      ...(longNeedsChainlink
        ? { [config.longPegAsset]: longChainlinkHistory }
        : {}),
      ...(shortNeedsChainlink
        ? { [config.shortPegAsset]: shortChainlinkHistory }
        : {}),
    }),
    [
      longNeedsChainlink,
      shortNeedsChainlink,
      config.longPegAsset,
      config.shortPegAsset,
      longChainlinkHistory,
      shortChainlinkHistory,
    ]
  );

  const {
    pricePoints,
    hourlySnapshots,
    isLoading: isSubgraphLoading,
    error: subgraphError,
  } = useSailPriceHistory({
    tokenAddress: leveragedTokenAddress || "",
    genesisAddress: markets[marketId]?.addresses?.genesis as string | undefined,
    sinceGenesisEnd: true,
    daysBack: 31,
    enabled: !!leveragedTokenAddress,
  });

  const mergedSubgraph = useMemo(
    () => mergeChartData(pricePoints, hourlySnapshots),
    [pricePoints, hourlySnapshots]
  );

  const livePrices = useMemo(
    () => ({
      ethPrice: pegTargetPrices.ethPrice,
      btcPrice: pegTargetPrices.btcPrice,
      eurPrice: pegTargetPrices.eurPrice,
      goldPrice: pegTargetPrices.goldPrice,
      silverPrice: pegTargetPrices.silverPrice,
    }),
    [pegTargetPrices]
  );

  const chartPoints = useMemo(
    () =>
      buildSailMarketChartPoints(
        config,
        mergedSubgraph,
        chainlinkHistories,
        livePrices
      ),
    [config, mergedSubgraph, chainlinkHistories, livePrices]
  );

  const filteredData = useMemo(
    () => filterByTimeRange(chartPoints, timeRange),
    [chartPoints, timeRange]
  );

  const validDefaultPoints = filteredData.filter((p) => Number.isFinite(p.defaultRatio));

  const formatTimestamp = useMemo(() => {
    return (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      switch (timeRange) {
        case "1D":
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        case "1W":
          return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "numeric",
            day: "numeric",
          });
        default:
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
      }
    };
  }, [timeRange]);

  const formatTooltipTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const isLoading =
    isSubgraphLoading ||
    (longNeedsChainlink && isLongChainlinkLoading) ||
    (shortNeedsChainlink && isShortChainlinkLoading);

  useEffect(() => {
    onConfigReady?.(config);
  }, [config, onConfigReady]);

  useEffect(() => {
    const ratio = computeLiveDefaultRatio(config, livePrices);
    onLiveDefaultRatioChange?.(ratio);
  }, [config, livePrices, onLiveDefaultRatioChange]);

  const toggleOverlay = () => {
    setShowHsPriceUsd((prev) => !prev);
  };

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <OverlayToggle
            label={`${config.hsSymbol} (USD)`}
            active={showHsPriceUsd}
            onClick={toggleOverlay}
            color="#6B5B95"
          />
        </div>
        <div className="flex items-center justify-end gap-4">
          <div className="text-xs text-[#1E4775]/60">
            {isLoading
              ? "Loading..."
              : `${validDefaultPoints.length} data points`}
          </div>
          <div className="flex gap-2">
            {(["1D", "1W", "1M"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs ${
                  timeRange === range
                    ? "bg-[#1E4775] text-white"
                    : "bg-[#eef1f7] text-[#4b5a78] hover:bg-[#1E4775]/10"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-[#1E4775]/60">
            Loading price history...
          </div>
        ) : validDefaultPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-[#1E4775]/60">
            {subgraphError
              ? "Price data unavailable (subgraph error)."
              : "No price data available"}
          </div>
        ) : (
          <SailMarketMultiSeriesChart
            data={filteredData}
            config={config}
            showHsPriceUsd={showHsPriceUsd}
            formatTimestamp={formatTimestamp}
            formatTooltipTimestamp={formatTooltipTimestamp}
          />
        )}
      </div>
    </div>
  );
}
