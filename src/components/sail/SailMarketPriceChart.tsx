"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { DefinedMarket } from "@/config/markets";
import {
  formatSailMarketDirectionTitle,
} from "@/utils/sailMarketDirectionLabels";
import {
  formatSailChartDefaultValue,
  type SailChartWindowPerformance,
  type SailMarketChartConfig,
} from "@/utils/sailMarketChartSeries";
import { SAIL_ADVANCED_FROSTED_LIGHT_PANEL } from "@/components/sail/advanced/sailAdvancedStyles";
import { SailChartPerformanceSummary } from "@/components/sail/SailChartPerformanceSummary";

const SailMarketChart = dynamic(
  () =>
    import("@/components/sail/SailMarketChart").then((m) => m.SailMarketChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-72 items-center justify-center text-sm text-[#1E4775]/60">
        Loading chart…
      </div>
    ),
  }
);

export type SailMarketPriceChartSize = "default" | "large";

const SAIL_CHART_HEIGHT_CLASS: Record<SailMarketPriceChartSize, string> = {
  default: "h-72 min-h-72",
  /** UI+ chart column — tall on mobile; fills parent on desktop. */
  large:
    "min-h-[22rem] h-[22rem] sm:min-h-[26rem] sm:h-[26rem] lg:min-h-0 lg:h-full lg:flex-1",
};

export type SailMarketPriceChartProps = {
  marketId: string;
  market: DefinedMarket;
  className?: string;
  /** Hide title row (e.g. when parent supplies its own heading). */
  hideTitle?: boolean;
  /** Price + symbol header for UI+ chart column. */
  showPriceHeader?: boolean;
  size?: SailMarketPriceChartSize;
  /** Grow chart to fill column height (UI+ desktop grid). */
  fillHeight?: boolean;
};

/**
 * Sail market chart — default view shows long priced in short units with optional USD overlays.
 */
export function SailMarketPriceChart({
  marketId,
  market,
  className = "",
  hideTitle = false,
  showPriceHeader = false,
  size = "default",
  fillHeight = false,
}: SailMarketPriceChartProps) {
  const chartTitle = formatSailMarketDirectionTitle(market);
  const chartHeightClass = fillHeight
    ? "flex min-h-[22rem] flex-col sm:min-h-[26rem] lg:min-h-0 lg:h-full lg:flex-1"
    : SAIL_CHART_HEIGHT_CLASS[size];

  const [chartConfig, setChartConfig] = useState<SailMarketChartConfig | null>(null);
  const [liveDefaultRatio, setLiveDefaultRatio] = useState<number | null>(null);
  const [showHsOverlay, setShowHsOverlay] = useState(true);
  const [hasHsOverlayData, setHasHsOverlayData] = useState(false);
  const [windowPerformance, setWindowPerformance] =
    useState<SailChartWindowPerformance | null>(null);

  const handleConfigReady = useCallback((config: SailMarketChartConfig) => {
    setChartConfig(config);
  }, []);

  const handleLiveDefaultRatioChange = useCallback((value: number | null) => {
    setLiveDefaultRatio(value);
  }, []);

  const primaryDisplay =
    chartConfig != null
      ? formatSailChartDefaultValue(liveDefaultRatio, chartConfig)
      : "—";

  return (
    <div
      className={`flex flex-col rounded-xl p-3 ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} ${
        fillHeight ? "lg:h-full lg:min-h-0 lg:flex-1" : ""
      } ${className}`}
    >
      {showPriceHeader ? (
        <div className="mb-2 flex shrink-0 items-end justify-between gap-3 border-b border-[#1E4775]/10 pb-2">
          <div className="min-w-0 shrink-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/50">
              {chartConfig?.defaultMetricLabel ?? "Market rate"}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base">
              {primaryDisplay}
            </p>
          </div>
          {windowPerformance && hasHsOverlayData && chartConfig ? (
            <SailChartPerformanceSummary
              performance={windowPerformance}
              marketPairLabel={`${chartConfig.longLabel}/${chartConfig.shortLabel}`}
              className="min-w-0 flex-1 sm:flex-none"
            />
          ) : null}
        </div>
      ) : !hideTitle ? (
        <h3 className="mb-3 text-sm font-semibold text-[#1E4775]">
          {chartConfig?.defaultMetricLabel ?? chartTitle}
        </h3>
      ) : null}
      <div className={`${chartHeightClass} flex flex-col`}>
        <SailMarketChart
          marketId={marketId}
          market={market}
          onConfigReady={handleConfigReady}
          onLiveDefaultRatioChange={handleLiveDefaultRatioChange}
          showHsPriceOverlay={showPriceHeader ? showHsOverlay : undefined}
          onShowHsPriceOverlayChange={showPriceHeader ? setShowHsOverlay : undefined}
          hideLegend={showPriceHeader}
          onHasHsPriceDataChange={showPriceHeader ? setHasHsOverlayData : undefined}
          onWindowPerformanceChange={
            showPriceHeader ? setWindowPerformance : undefined
          }
        />
      </div>
    </div>
  );
}
