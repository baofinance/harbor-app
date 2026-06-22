"use client";

import type { UpsideBenchmarkRow } from "@/utils/maidenVoyageUpsideBenchmarks";
import {
  formatTvlBenchmarkLabel,
  formatUsdRange,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { MV_STAT_TILE } from "./maidenVoyageLayoutStyles";

export type GenesisUpsideBenchmarkCardsProps = {
  benchmarks: UpsideBenchmarkRow[];
};

export function GenesisUpsideBenchmarkCards({
  benchmarks,
}: GenesisUpsideBenchmarkCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {benchmarks.map((row) => (
        <div
          key={row.tvlUsd}
          className={`${MV_STAT_TILE} min-w-0 px-2 py-2 text-center sm:px-3 sm:py-2.5`}
        >
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-white/45">
            {formatTvlBenchmarkLabel(row.tvlUsd)}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] leading-tight tabular-nums text-white/55">
            {formatUsdRange(row.marketRevenueLowUsd, row.marketRevenueHighUsd, {
              approximate: true,
            })}{" "}
            rev
          </p>
          <p className="mt-1 truncate">
            <span className="font-mono text-xs font-semibold tabular-nums text-[#B8EBD5] sm:text-sm">
              {formatUsdRange(row.yourEarningsLowUsd, row.yourEarningsHighUsd)}
            </span>
            <span className="text-[10px] text-white/55">/yr</span>
          </p>
        </div>
      ))}
    </div>
  );
}
