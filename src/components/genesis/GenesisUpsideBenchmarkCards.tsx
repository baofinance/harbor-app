"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartBarIcon,
  ChevronRightIcon,
  RocketLaunchIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import type { UpsideBenchmarkRow } from "@/utils/maidenVoyageUpsideBenchmarks";
import {
  formatTvlBenchmarkLabel,
  formatUsdRange,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { GenesisUpsideAnimatedUsdRange } from "./GenesisUpsideAnimatedMetrics";
import {
  MV_UPSIDE_BENCHMARK_TILE,
  MV_UPSIDE_BENCHMARK_TILE_UPDATED,
  MV_UPSIDE_STAGE_BY_ID,
  type UpsideGrowthStageId,
} from "./maidenVoyageLayoutStyles";

export type GenesisUpsideBenchmarkCardsProps = {
  benchmarks: UpsideBenchmarkRow[];
  depositUsd: number;
};

const STAGE_ICONS = {
  launch: RocketLaunchIcon,
  growth: ChartBarIcon,
  scale: ViewfinderCircleIcon,
} as const;

function getGrowthStage(tvlUsd: number) {
  return MAIDEN_VOYAGE_UPSIDE_COPY.growthStages.find(
    (stage) => stage.tvlUsd === tvlUsd,
  );
}

function formatAssumptionLine(row: UpsideBenchmarkRow): string {
  return `${formatUsdRange(row.marketRevenueLowUsd, row.marketRevenueHighUsd, {
    approximate: true,
  })} ${MAIDEN_VOYAGE_UPSIDE_COPY.marketRevenueSuffix} at ${formatTvlBenchmarkLabel(row.tvlUsd)}`;
}

function BenchmarkCard({
  row,
  isUpdated = false,
}: {
  row: UpsideBenchmarkRow;
  isUpdated?: boolean;
}) {
  const stage = getGrowthStage(row.tvlUsd);
  const stageId = (stage?.id ?? "launch") as UpsideGrowthStageId;
  const theme = MV_UPSIDE_STAGE_BY_ID[stageId];
  const Icon = STAGE_ICONS[stageId];

  return (
    <div
      className={`${MV_UPSIDE_BENCHMARK_TILE} ${theme.hover} ${theme.accentBar} min-w-0 px-2.5 py-2.5 sm:px-3 sm:py-3 ${
        isUpdated ? MV_UPSIDE_BENCHMARK_TILE_UPDATED : ""
      }`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 sm:gap-x-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9 ${theme.icon}`}
        >
          <Icon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
        </div>

        <div className="min-w-0 text-center">
          {stage ? (
            <p className="mb-1.5 flex justify-center">
              <span
                className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:text-[10px] ${theme.badge}`}
              >
                {stage.label}
              </span>
            </p>
          ) : null}
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/55 sm:text-xs">
            {MAIDEN_VOYAGE_UPSIDE_COPY.youEarn}
          </p>
          <p className="mt-1 font-mono leading-tight tabular-nums">
            <GenesisUpsideAnimatedUsdRange
              lowUsd={row.yourEarningsLowUsd}
              highUsd={row.yourEarningsHighUsd}
              className="text-base font-bold text-white sm:text-lg"
            />
            <span className="text-xs text-white/80 sm:text-sm">
              {MAIDEN_VOYAGE_UPSIDE_COPY.earningsSuffix}
            </span>
          </p>
          <p className="mt-2 max-w-full font-mono text-[11px] leading-snug tabular-nums text-white/50 sm:text-xs">
            {formatAssumptionLine(row)}
          </p>
        </div>

        {/* Balance column — keeps center text aligned to the card, not the remainder after the icon */}
        <div className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" aria-hidden />
      </div>
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
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-1.5">
        {benchmarks.map((row, index) => (
          <div key={row.tvlUsd} className="contents">
            <BenchmarkCard row={row} isUpdated={cardsUpdated} />
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
