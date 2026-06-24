"use client";

import { CalculatorIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  UPSIDE_BENCHMARK_TVLS_USD,
  UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT,
  UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT,
} from "@/utils/maidenVoyageUpsideBenchmarks";
import { formatUsdRange } from "@/utils/maidenVoyageUpsideBenchmarks";
import { formatUSD } from "@/utils/formatters";
import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_DETAILS_PANEL,
  MV_UPSIDE_EXPLAINER_ICON,
} from "./maidenVoyageLayoutStyles";

export function GenesisUpsideBenchmarkExplainer() {
  return (
    <details className={`${MV_DETAILS_PANEL} group rounded-xl`}>
      <summary className="cursor-pointer list-none px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <div className={MV_UPSIDE_EXPLAINER_ICON}>
            <CalculatorIcon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-white/90">
              How are these estimates calculated?
            </p>
            <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.explainerSubtitle}
            </p>
          </div>
          <span
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-white/50 transition group-open:text-white/70"
            aria-hidden
          >
            <span className="group-open:hidden">
              {MAIDEN_VOYAGE_UPSIDE_COPY.explainerToggleShow}
            </span>
            <span className="hidden group-open:inline">
              {MAIDEN_VOYAGE_UPSIDE_COPY.explainerToggleHide}
            </span>
            <ChevronDownIcon className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </span>
        </div>
      </summary>

      <div className="space-y-2 border-t border-white/10 px-3 py-2.5 sm:px-4">
        <p className={MV_BODY_TEXT}>
          Harbor markets have historically generated approximately{" "}
          {UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT}–
          {UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT}% of TVL in annual revenue.
        </p>

        <ul className={`space-y-1.5 ${MV_BODY_TEXT}`}>
          {UPSIDE_BENCHMARK_TVLS_USD.map((tvlUsd) => {
            const low = tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT / 100);
            const high =
              tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT / 100);
            return (
              <li key={tvlUsd} className="font-mono text-sm tabular-nums">
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

        <p className={MV_BODY_TEXT}>
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
