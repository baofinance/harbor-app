"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  estimateMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import {
  computeUpsideBenchmarks,
  formatUsdRange,
  UPSIDE_BENCHMARK_TVLS_USD,
  UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT,
  UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { formatUSD } from "@/utils/formatters";
import { GenesisUpsideBenchmarkCards } from "./GenesisUpsideBenchmarkCards";
import { GenesisUpsideHeroMetric } from "./GenesisUpsideHeroMetric";
import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

function GenesisUpsideBenchmarkExplainer() {
  return (
    <details className="group border-t border-white/[0.06] pt-2">
      <summary className="cursor-pointer list-none py-1.5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/45">
            How are these estimates calculated?
          </span>
          <span
            className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-white/35 transition group-open:text-white/50"
            aria-hidden
          >
            <span className="group-open:hidden">
              {MAIDEN_VOYAGE_UPSIDE_COPY.explainerToggleShow}
            </span>
            <span className="hidden group-open:inline">
              {MAIDEN_VOYAGE_UPSIDE_COPY.explainerToggleHide}
            </span>
            <ChevronDownIcon className="h-3 w-3 transition group-open:rotate-180" />
          </span>
        </div>
      </summary>

      <div className="space-y-2 pb-1 pt-2">
        <p className={`text-xs ${MV_BODY_TEXT}`}>
          Harbor markets have historically generated approximately{" "}
          {UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT}–
          {UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT}% of TVL in annual revenue.
        </p>

        <ul className={`space-y-1.5 text-xs ${MV_BODY_TEXT}`}>
          {UPSIDE_BENCHMARK_TVLS_USD.map((tvlUsd) => {
            const low = tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT / 100);
            const high =
              tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT / 100);
            return (
              <li key={tvlUsd} className="font-mono tabular-nums">
                {formatUSD(tvlUsd, {
                  compact: true,
                  minDecimals: 0,
                  maxDecimals: 0,
                })}{" "}
                TVL →{" "}
                {formatUsdRange(low, high, { approximate: true })}{" "}
                annual revenue
              </li>
            );
          })}
        </ul>

        <p className={`text-xs ${MV_BODY_TEXT}`}>
          Your estimated earnings are calculated using your current share of
          future market revenue.
        </p>
        <p className={MV_CAPTION_TEXT}>
          Future performance is uncertain and depends on market adoption and
          usage. These examples illustrate the relationship between TVL and
          revenue — they are not forecasts.
        </p>
      </div>
    </details>
  );
}

export type GenesisRevenueShareCalculatorProps = {
  capUsd: number | null;
  yieldRevSharePct: number | null;
  initialDepositUsd: number;
  className?: string;
};

function clampDeposit(value: number, capUsd: number | null): number {
  const max = capUsd ?? 10_000_000;
  return Math.min(max, Math.max(0, value));
}

export function GenesisRevenueShareCalculator({
  capUsd,
  yieldRevSharePct,
  initialDepositUsd,
  className = "",
}: GenesisRevenueShareCalculatorProps) {
  const [depositUsd, setDepositUsd] = useState(initialDepositUsd);

  useEffect(() => {
    setDepositUsd(clampDeposit(initialDepositUsd, capUsd));
  }, [initialDepositUsd, capUsd]);

  const revenueSharePct = useMemo(
    () =>
      estimateMaidenVoyageYieldSharePct({
        depositUsd,
        capUsd,
        yieldRevSharePct,
      }),
    [depositUsd, capUsd, yieldRevSharePct],
  );

  const benchmarks = useMemo(
    () => computeUpsideBenchmarks(revenueSharePct),
    [revenueSharePct],
  );

  return (
    <section
      className={`${MV_CARD_SHELL} w-full px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
      aria-label="Explore the upside"
    >
      <div>
        <div className="min-w-0 border-l-2 border-[#FF8A7A]/50 pl-2.5 text-center sm:text-left">
          <h2 className="text-sm font-semibold text-white/90">
            {MAIDEN_VOYAGE_UPSIDE_COPY.sectionTitle}
          </h2>
          {yieldRevSharePct != null && yieldRevSharePct > 0 ? (
            <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.sectionCaption}
            </p>
          ) : null}
        </div>

        <div className="mt-3 space-y-2.5">
          <GenesisUpsideHeroMetric
            revenueSharePct={revenueSharePct}
            depositUsd={depositUsd}
            capUsd={capUsd}
            onDepositChange={(v) => setDepositUsd(clampDeposit(v, capUsd))}
          />

          <div className="space-y-1.5">
            <p className={MV_SECTION_LABEL}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.benchmarkIntro}
            </p>
            <GenesisUpsideBenchmarkCards
              benchmarks={benchmarks}
              depositUsd={depositUsd}
            />
          </div>

          <GenesisUpsideBenchmarkExplainer />
        </div>
      </div>
    </section>
  );
}
