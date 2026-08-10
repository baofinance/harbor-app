"use client";

import { useEffect, useMemo, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import { markets } from "@/config/markets";
import InfoTooltip from "@/components/InfoTooltip";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import { useChainlinkUsdHistory } from "@/hooks/useChainlinkUsdHistory";
import { mergeChartData, useSailPriceHistory } from "@/hooks/useSailPriceHistory";
import { useSailPerpBenchmark } from "@/hooks/useSailPerpBenchmark";
import {
  attachPerpBenchmarkSeries,
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
import { SailPerpBenchmarkSummary } from "./SailPerpBenchmarkSummary";

const SAIL_CHART_COMPARISON_INFO = (
  <div className="space-y-3 text-sm leading-relaxed">
    <p>
      Chart performance is measured versus the start of the selected time range
      (not all-time). Toggle overlays to compare the leveraged token and a
      modeled Hyperliquid perpetual against the underlying market.
    </p>
    <div>
      <p className="font-semibold text-white">Hyperliquid comparison</p>
      <p className="mt-1 text-white/85">
        A same-capital backtest: both sides start with $1,000. Sail uses
        historical token NAV with modeled mint/redeem fees. The Hyperliquid side
        opens once at Sail’s leverage at the range start and is held without
        rebalancing (no margin top-ups).
      </p>
    </div>
    <ul className="list-disc space-y-1 pl-4 text-white/85">
      <li>
        Exposure mirrors the Sail market (e.g. long ETH / short the peg leg,
        including HIP-3 markets like EUR where needed).
      </li>
      <li>
        Costs include taker fees, small modeled slippage, historical funding,
        and hour-close liquidation checks.
      </li>
      <li>
        Sail net is NAV after fees; Hyperliquid is account equity after those
        costs. “Liquidated” means modeled equity hit zero under the hold.
      </li>
    </ul>
    <p className="text-white/70">
      This is an illustrative comparison, not a guarantee of realized trader
      PnL on Hyperliquid.
    </p>
  </div>
);

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
  const [showPerpBenchmark, setShowPerpBenchmark] = useState(true);
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

  const selectedMarket = markets[marketId as keyof typeof markets];
  const leveragedTokenAddress = selectedMarket?.addresses?.leveragedToken as
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
    genesisAddress: selectedMarket?.addresses?.genesis as string | undefined,
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
  const benchmarkWindow = useMemo(() => {
    if (filteredData.length < 2) return { start: null, end: null };
    return {
      start: filteredData[0]!.timestamp,
      end: filteredData[filteredData.length - 1]!.timestamp,
    };
  }, [filteredData]);
  const perpBenchmarkQuery = useSailPerpBenchmark({
    marketId,
    startTimestamp: benchmarkWindow.start,
    endTimestamp: benchmarkWindow.end,
    enabled: showPerpBenchmark && showHsPriceUsd,
  });
  const chartDataWithPerp = useMemo(
    () =>
      attachPerpBenchmarkSeries(
        filteredData,
        showPerpBenchmark
          ? (perpBenchmarkQuery.data?.benchmark.points ?? [])
          : [],
      ),
    [filteredData, showPerpBenchmark, perpBenchmarkQuery.data],
  );

  const validDefaultPoints = filteredData.filter((p) => Number.isFinite(p.defaultRatio));
  const hasHsPriceData = useMemo(
    () => sailChartHasHsPriceOverlay(filteredData),
    [filteredData]
  );

  const windowPerformance = useMemo(() => {
    if (!hasHsPriceData) return null;
    const performance = computeSailChartWindowPerformance(filteredData);
    const sailNetReturn = showPerpBenchmark
      ? perpBenchmarkQuery.data?.benchmark.sailNetReturnPct
      : null;
    if (sailNetReturn == null) return performance;
    return {
      ...performance,
      leverageTokenPerformancePct: sailNetReturn,
      leverageTokenVsMarketPct:
        performance.marketPerformancePct == null
          ? null
          : sailNetReturn - performance.marketPerformancePct,
      leverageTokenIsNet: true,
    };
  }, [
    filteredData,
    hasHsPriceData,
    showPerpBenchmark,
    perpBenchmarkQuery.data,
  ]);

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
        <OverlayToggle
          label="Hyperliquid comparison"
          active={showPerpBenchmark}
          onClick={() => {
            setShowPerpBenchmark((current) => !current);
            if (!showHsPriceUsd) setShowHsPriceUsd(true);
          }}
          color="#6D5BD0"
          disabled={!hasHsPriceData && !isBlockingLoading}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-[#1E4775]/60">
          {isBlockingLoading ? (
            <span>Loading...</span>
          ) : isEnrichingOracles ? (
            <span>Loading market prices...</span>
          ) : (
            <InfoTooltip
              side="bottom"
              centerOnMobile
              label={SAIL_CHART_COMPARISON_INFO}
            >
              <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-[#1E4775]/25 bg-white/70 text-[11px] font-semibold text-[#1E4775]/70 transition hover:border-[#1E4775]/40 hover:bg-white hover:text-[#1E4775]">
                i
              </span>
            </InfoTooltip>
          )}
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
      {showPerpBenchmark ? (
        <div className="mb-2 shrink-0">
          <SailPerpBenchmarkSummary
            data={perpBenchmarkQuery.data ?? null}
            isLoading={perpBenchmarkQuery.isLoading}
            error={
              perpBenchmarkQuery.error instanceof Error
                ? perpBenchmarkQuery.error.message
                : null
            }
          />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {isBlockingLoading ? (
          <div className="flex h-full items-center justify-center text-[#1E4775]/60">
            {isSubgraphLoading
              ? "Loading price history..."
              : "Loading market prices..."}
          </div>
        ) : validDefaultPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-[#1E4775]/60">
            {subgraphError
              ? "Price data unavailable (subgraph error)."
              : "No price data available"}
          </div>
        ) : (
          <SailMarketMultiSeriesChart
            data={chartDataWithPerp}
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
