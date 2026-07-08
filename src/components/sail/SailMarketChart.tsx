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
  computeSailChartWindowPerformance,
  getSailMarketChartConfig,
  sailChartHasHsPriceOverlay,
  type SailChartWindowPerformance,
  type SailMarketChartConfig,
} from "@/utils/sailMarketChartSeries";
import {
  SAIL_CHART_HS_COLOR,
  SAIL_CHART_LEVERAGE_TOKEN_LABEL,
  SAIL_CHART_TOGGLE_ACTIVE_CLASS,
  SAIL_CHART_TOGGLE_IDLE_CLASS,
} from "@/components/sail/advanced/sailAdvancedStyles";
import {
  SAIL_CHART_TIME_RANGES,
  filterSailChartPointsByRange,
  formatSailChartAxisTimestamp,
  sailChartFetchDaysForRange,
  type SailChartTimeRange,
} from "@/utils/sailChartTimeRange";
import {
  SailMarketMultiSeriesChart,
} from "./SailMarketMultiSeriesChart";

export type SailMarketChartProps = {
  marketId: string;
  market: DefinedMarket;
  onLiveDefaultRatioChange?: (value: number | null) => void;
  onConfigReady?: (config: SailMarketChartConfig) => void;
  /** Controlled compare overlay toggle (optional). */
  showHsPriceOverlay?: boolean;
  onShowHsPriceOverlayChange?: (value: boolean) => void;
  /** Hide Recharts legend when rendered in the price header. */
  hideLegend?: boolean;
  onHasHsPriceDataChange?: (hasData: boolean) => void;
  onWindowPerformanceChange?: (performance: SailChartWindowPerformance | null) => void;
};

function OverlayToggle({
  label,
  active,
  onClick,
  color,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? SAIL_CHART_TOGGLE_ACTIVE_CLASS
          : SAIL_CHART_TOGGLE_IDLE_CLASS
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
  showHsPriceOverlay,
  onShowHsPriceOverlayChange,
  hideLegend = false,
  onHasHsPriceDataChange,
  onWindowPerformanceChange,
}: SailMarketChartProps) {
  const [timeRange, setTimeRange] = useState<SailChartTimeRange>("1M");
  const [internalShowHsPriceUsd, setInternalShowHsPriceUsd] = useState(true);
  const showHsPriceUsd = showHsPriceOverlay ?? internalShowHsPriceUsd;
  const setShowHsPriceUsd = onShowHsPriceOverlayChange ?? setInternalShowHsPriceUsd;

  const config = useMemo(() => getSailMarketChartConfig(market), [market]);
  const pegTargetPrices = usePegTargetPrices();
  const fetchDays = useMemo(
    () => sailChartFetchDaysForRange(timeRange),
    [timeRange]
  );
  const chartSinceTimestamp = useMemo(
    () => Math.floor(Date.now() / 1000) - fetchDays * 24 * 60 * 60,
    [fetchDays]
  );

  const leveragedTokenAddress = markets[marketId]?.addresses?.leveragedToken as
    | string
    | undefined;

  const longNeedsChainlink = config.longPegAsset !== "USD";
  const shortNeedsChainlink = config.shortPegAsset !== "USD";

  const { priceHistory: longChainlinkHistory, isLoading: isLongChainlinkLoading } =
    useChainlinkUsdHistory(
      longNeedsChainlink ? config.longPegAsset : null,
      longNeedsChainlink,
      chartSinceTimestamp
    );

  const { priceHistory: shortChainlinkHistory, isLoading: isShortChainlinkLoading } =
    useChainlinkUsdHistory(
      shortNeedsChainlink ? config.shortPegAsset : null,
      shortNeedsChainlink,
      chartSinceTimestamp
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
    daysBack: fetchDays,
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
      buildSailMarketChartPoints(config, mergedSubgraph, chainlinkHistories),
    [config, mergedSubgraph, chainlinkHistories]
  );

  const filteredData = useMemo(
    () => filterSailChartPointsByRange(chartPoints, timeRange),
    [chartPoints, timeRange]
  );

  const validDefaultPoints = filteredData.filter((p) => Number.isFinite(p.defaultRatio));
  const hasHsPriceData = useMemo(
    () => sailChartHasHsPriceOverlay(filteredData),
    [filteredData]
  );

  const windowPerformance = useMemo(() => {
    if (!hasHsPriceData) return null;
    return computeSailChartWindowPerformance(filteredData);
  }, [filteredData, hasHsPriceData]);

  const formatTimestamp = useMemo(() => {
    return (timestamp: number) =>
      formatSailChartAxisTimestamp(timestamp, timeRange);
  }, [timeRange]);

  const formatTooltipTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const isEnrichingOracles =
    (longNeedsChainlink && isLongChainlinkLoading) ||
    (shortNeedsChainlink && isShortChainlinkLoading);
  const isAwaitingChartPoints =
    validDefaultPoints.length === 0 && !subgraphError && isEnrichingOracles;
  const isBlockingLoading = isSubgraphLoading || isAwaitingChartPoints;

  useEffect(() => {
    onConfigReady?.(config);
  }, [config, onConfigReady]);

  useEffect(() => {
    const ratio = computeLiveDefaultRatio(config, livePrices);
    onLiveDefaultRatioChange?.(ratio);
  }, [config, livePrices, onLiveDefaultRatioChange]);

  useEffect(() => {
    onHasHsPriceDataChange?.(hasHsPriceData);
  }, [hasHsPriceData, onHasHsPriceDataChange]);

  useEffect(() => {
    onWindowPerformanceChange?.(windowPerformance);
  }, [windowPerformance, onWindowPerformanceChange]);

  const toggleOverlay = () => {
    setShowHsPriceUsd(!showHsPriceUsd);
  };

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <OverlayToggle
          label={`Compare ${SAIL_CHART_LEVERAGE_TOKEN_LABEL}`}
          active={showHsPriceUsd}
          onClick={toggleOverlay}
          color={SAIL_CHART_HS_COLOR}
          disabled={!hasHsPriceData && !isBlockingLoading}
        />
        <div className="min-w-0 flex-1 text-xs text-[#1E4775]/60">
          {isBlockingLoading
            ? "Loading..."
            : isEnrichingOracles
              ? "Updating oracle data..."
              : showHsPriceUsd && hasHsPriceData
                ? "Performance vs start of range"
                : `${validDefaultPoints.length} data points`}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
          {SAIL_CHART_TIME_RANGES.map((range) => (
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
      <div className="min-h-0 flex-1">
        {isBlockingLoading ? (
          <div className="flex h-full items-center justify-center text-[#1E4775]/60">
            {isSubgraphLoading
              ? "Loading price history..."
              : "Updating oracle data..."}
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
            showHsPriceUsd={showHsPriceUsd && hasHsPriceData}
            formatTimestamp={formatTimestamp}
            formatTooltipTimestamp={formatTooltipTimestamp}
            hideLegend={hideLegend}
          />
        )}
      </div>
    </div>
  );
}
