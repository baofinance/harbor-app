"use client";

import type { UpsideBenchmarkRow } from "@/utils/maidenVoyageUpsideBenchmarks";
import {
  formatTvlBenchmarkLabel,
  formatUsdRange,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { MV_CAPTION_TEXT, MV_SECTION_LABEL } from "./maidenVoyageLayoutStyles";

const CARD_ACCENTS = [
  "from-[#FF8A7A]/[0.08] to-transparent",
  "from-[#B8EBD5]/[0.08] to-transparent",
  "from-[#5B8FD4]/[0.08] to-transparent",
] as const;

export type GenesisUpsideBenchmarkCardsProps = {
  benchmarks: UpsideBenchmarkRow[];
};

export function GenesisUpsideBenchmarkCards({
  benchmarks,
}: GenesisUpsideBenchmarkCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {benchmarks.map((row, index) => (
        <div
          key={row.tvlUsd}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#122a47]/46 px-3 py-3.5 text-center backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:px-4 sm:py-4"
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${CARD_ACCENTS[index % CARD_ACCENTS.length]}`}
            aria-hidden
          />
          <div className="relative space-y-1.5">
            <p className="text-sm font-semibold text-white/90">
              {formatTvlBenchmarkLabel(row.tvlUsd)}
            </p>
            <p className={`${MV_CAPTION_TEXT} font-mono tabular-nums`}>
              {formatUsdRange(row.marketRevenueLowUsd, row.marketRevenueHighUsd, {
                approximate: true,
              })}{" "}
              annual revenue
            </p>
            <p className="pt-1">
              <span className={MV_SECTION_LABEL}>You earn: </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#B8EBD5]">
                {formatUsdRange(row.yourEarningsLowUsd, row.yourEarningsHighUsd)}
              </span>
              <span className={`${MV_CAPTION_TEXT} ml-0.5`}>/ year</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
