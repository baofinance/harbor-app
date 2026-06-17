import { formatUSD } from "@/utils/formatters";

/** Illustrative TVL scenarios — not forecasts. */
export const UPSIDE_BENCHMARK_TVLS_USD = [
  100_000,
  1_000_000,
  10_000_000,
] as const;

/** Historical Harbor market revenue as a share of TVL (annual). */
export const UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT = 5;
export const UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT = 10;

export type UpsideBenchmarkRow = {
  tvlUsd: number;
  marketRevenueLowUsd: number;
  marketRevenueHighUsd: number;
  yourEarningsLowUsd: number;
  yourEarningsHighUsd: number;
};

export function computeUpsideBenchmarks(
  revenueSharePct: number | null,
): UpsideBenchmarkRow[] {
  const shareFraction =
    revenueSharePct != null && revenueSharePct > 0 ? revenueSharePct / 100 : 0;

  return UPSIDE_BENCHMARK_TVLS_USD.map((tvlUsd) => {
    const marketRevenueLowUsd =
      tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_LOW_PCT / 100);
    const marketRevenueHighUsd =
      tvlUsd * (UPSIDE_HISTORICAL_REVENUE_RATE_HIGH_PCT / 100);

    return {
      tvlUsd,
      marketRevenueLowUsd,
      marketRevenueHighUsd,
      yourEarningsLowUsd: marketRevenueLowUsd * shareFraction,
      yourEarningsHighUsd: marketRevenueHighUsd * shareFraction,
    };
  });
}

export function formatTvlBenchmarkLabel(tvlUsd: number): string {
  return `${formatUSD(tvlUsd, { compact: true, minDecimals: 0, maxDecimals: 0 })} TVL`;
}

function formatRangePart(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";

  if (value >= 1_000) {
    return formatUSD(value, {
      compact: true,
      minDecimals: 0,
      maxDecimals: 0,
    }).replace(/^\$/, "");
  }

  if (value >= 100) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  if (value >= 10) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Compact dollar range, e.g. "$5k–10k" or "$5–10". */
export function formatUsdRange(
  lowUsd: number,
  highUsd: number,
  options: { approximate?: boolean } = {},
): string {
  const { approximate = false } = options;
  const prefix = approximate ? "≈ $" : "$";
  const lowPart = formatRangePart(lowUsd);
  const highPart = formatRangePart(highUsd);

  if (lowPart === highPart) {
    return `${prefix}${lowPart}`;
  }

  return `${prefix}${lowPart}–${highPart}`;
}
