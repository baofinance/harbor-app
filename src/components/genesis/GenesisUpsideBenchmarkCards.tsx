"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import type { UpsideBenchmarkRow } from "@/utils/maidenVoyageUpsideBenchmarks";
import {
  formatTvlBenchmarkLabel,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { GenesisUpsideAnimatedUsdRange } from "./GenesisUpsideAnimatedMetrics";
import {
  MV_UPSIDE_BENCHMARK_TILE,
  MV_UPSIDE_BENCHMARK_TILE_DESTINATION,
  MV_UPSIDE_BENCHMARK_TILE_UPDATED,
  MV_UPSIDE_EARNINGS_TEXT,
  MV_UPSIDE_NEUTRAL_META,
} from "./maidenVoyageLayoutStyles";

export type GenesisUpsideBenchmarkCardsProps = {
  benchmarks: UpsideBenchmarkRow[];
  depositUsd: number;
};

function getGrowthStageLabel(tvlUsd: number): string {
  return (
    MAIDEN_VOYAGE_UPSIDE_COPY.growthStages.find((stage) => stage.tvlUsd === tvlUsd)
      ?.label ?? ""
  );
}

function BenchmarkCard({
  row,
  isDestination = false,
  isUpdated = false,
}: {
  row: UpsideBenchmarkRow;
  isDestination?: boolean;
  isUpdated?: boolean;
}) {
  const stageLabel = getGrowthStageLabel(row.tvlUsd);

  return (
    <div
      className={`${MV_UPSIDE_BENCHMARK_TILE} min-w-0 px-2 py-2 text-center sm:px-3 sm:py-2.5 ${
        isDestination ? MV_UPSIDE_BENCHMARK_TILE_DESTINATION : ""
      } ${isUpdated ? MV_UPSIDE_BENCHMARK_TILE_UPDATED : ""}`}
    >
      {stageLabel ? (
        <p className="mb-1">
          <span
            className={`inline-block rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 ${MV_UPSIDE_NEUTRAL_META}`}
          >
            {stageLabel}
          </span>
        </p>
      ) : null}
      <p className={`truncate ${MV_UPSIDE_NEUTRAL_META}`}>
        {MAIDEN_VOYAGE_UPSIDE_COPY.youEarn}
      </p>
      <p className="mt-0.5 truncate">
        <GenesisUpsideAnimatedUsdRange
          lowUsd={row.yourEarningsLowUsd}
          highUsd={row.yourEarningsHighUsd}
          className={`font-mono text-sm font-bold tabular-nums sm:text-base ${MV_UPSIDE_EARNINGS_TEXT}`}
        />
        <span className={`text-[10px] ${MV_UPSIDE_EARNINGS_TEXT} opacity-80`}>
          {MAIDEN_VOYAGE_UPSIDE_COPY.earningsSuffix}
        </span>
      </p>
      <p className="mt-1.5 truncate font-mono text-[10px] leading-tight tabular-nums text-white/50">
        <GenesisUpsideAnimatedUsdRange
          lowUsd={row.marketRevenueLowUsd}
          highUsd={row.marketRevenueHighUsd}
          approximate
          className="text-[10px] text-white/50"
          suffix={` ${MAIDEN_VOYAGE_UPSIDE_COPY.marketRevenueSuffix}`}
        />
      </p>
      <p className={`mt-1 truncate ${MV_UPSIDE_NEUTRAL_META}`}>
        At {formatTvlBenchmarkLabel(row.tvlUsd)}
      </p>
    </div>
  );
}

export function GenesisUpsideBenchmarkCards({
  benchmarks,
  depositUsd,
}: GenesisUpsideBenchmarkCardsProps) {
  const [cardsUpdated, setCardsUpdated] = useState(false);
  const prevDepositRef = useRef(depositUsd);

  useEffect(() => {
    if (prevDepositRef.current === depositUsd) return;
    prevDepositRef.current = depositUsd;
    setCardsUpdated(true);
    const timeoutId = window.setTimeout(() => setCardsUpdated(false), 450);
    return () => window.clearTimeout(timeoutId);
  }, [depositUsd]);

  return (
    <div className="relative pt-1">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px sm:block"
        aria-hidden
      >
        <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        {benchmarks.map((row, index) => (
          <span
            key={row.tvlUsd}
            className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25"
            style={{ left: `${((index + 0.5) / benchmarks.length) * 84 + 8}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-1.5">
        {benchmarks.map((row, index) => (
          <div key={row.tvlUsd} className="contents">
            <BenchmarkCard
              row={row}
              isDestination={index === benchmarks.length - 1}
              isUpdated={cardsUpdated}
            />
            {index < benchmarks.length - 1 ? (
              <div
                className="hidden items-center justify-center sm:flex"
                aria-hidden
              >
                <ChevronRightIcon className="h-3.5 w-3.5 text-white/25" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
