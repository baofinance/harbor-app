import type { PegAssetKey } from "@/utils/sailMarketChartSeries";
import { sailChartRangeWindowSec } from "@/utils/sailChartTimeRange";

export type PegTargetLivePrices = {
  ethPrice: number | null;
  btcPrice: number | null;
  eurPrice: number | null;
  goldPrice: number | null;
  silverPrice: number | null;
};

/** Map market pegTarget (ETH, BTC, EUR, …) to a Chainlink-backed asset key. */
export function pegTargetToAssetKey(
  pegTarget: string | undefined | null,
): PegAssetKey | null {
  const normalized = (pegTarget || "USD").trim().toUpperCase();
  if (normalized === "USD") return "USD";
  if (normalized === "ETH" || normalized === "ETHEREUM") return "ETH";
  if (normalized === "BTC" || normalized === "BITCOIN") return "BTC";
  if (normalized === "EUR" || normalized === "EURO") return "EUR";
  if (normalized === "GOLD" || normalized === "XAU") return "XAU";
  if (normalized === "SILVER" || normalized === "XAG") return "XAG";
  return null;
}

export function pegAssetDisplayLabel(asset: PegAssetKey): string {
  switch (asset) {
    case "XAU":
      return "Gold";
    case "XAG":
      return "Silver";
    default:
      return asset;
  }
}

export function liveUsdPriceForPegAsset(
  asset: PegAssetKey,
  prices: PegTargetLivePrices,
): number | null {
  switch (asset) {
    case "ETH":
      return prices.ethPrice;
    case "BTC":
      return prices.btcPrice;
    case "EUR":
      return prices.eurPrice;
    case "XAU":
      return prices.goldPrice;
    case "XAG":
      return prices.silverPrice;
    case "USD":
      return 1;
  }
}

export function formatPegUsdPrice(
  price: number | null,
  asset: PegAssetKey,
): string {
  if (price == null || !Number.isFinite(price)) return "—";
  if (asset === "EUR") {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPegChartRangeChange(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function computePegChartRangeChangePct(
  points: Array<{ priceUsd: number }>,
): number | null {
  if (points.length < 2) return null;
  const first = points[0]!.priceUsd;
  const last = points[points.length - 1]!.priceUsd;
  if (!(first > 0) || !Number.isFinite(first) || !Number.isFinite(last)) {
    return null;
  }
  return ((last - first) / first) * 100;
}

export type PegPricePoint = { timestamp: number; priceUsd: number };

export function computePegChangePct(
  baselinePrice: number | null | undefined,
  currentPrice: number | null | undefined,
): number | null {
  if (baselinePrice == null || currentPrice == null) return null;
  if (
    !(baselinePrice > 0) ||
    !Number.isFinite(baselinePrice) ||
    !Number.isFinite(currentPrice)
  ) {
    return null;
  }
  return ((currentPrice - baselinePrice) / baselinePrice) * 100;
}

/** Last Chainlink price at or before `targetTimestamp`. */
export function pegPriceAtOrBefore(
  points: PegPricePoint[],
  targetTimestamp: number,
): number | null {
  if (points.length === 0) return null;
  let best: PegPricePoint | null = null;
  for (const point of points) {
    if (point.timestamp <= targetTimestamp) {
      if (!best || point.timestamp > best.timestamp) best = point;
    }
  }
  if (best) return best.priceUsd;
  return points[0]!.priceUsd;
}

/** First Chainlink price at or after `targetTimestamp` (YTD fallback). */
export function pegPriceAtOrAfter(
  points: PegPricePoint[],
  targetTimestamp: number,
): number | null {
  for (const point of points) {
    if (point.timestamp >= targetTimestamp) return point.priceUsd;
  }
  return null;
}

export function startOfYearTimestamp(
  nowSec = Math.floor(Date.now() / 1000),
): number {
  const date = new Date(nowSec * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), 0, 1) / 1000);
}

/** Unix timestamp for peg chart fetch (3M window + Jan 1 YTD baseline). */
export function pegChartHistorySinceTimestamp(
  nowSec = Math.floor(Date.now() / 1000),
): number {
  const threeMonthLookback = nowSec - (93 * 24 * 60 * 60);
  const ytdStart = startOfYearTimestamp(nowSec);
  return Math.min(threeMonthLookback, ytdStart);
}

/** Chainlink peg charts: oracle round density limits reliable history to ~3M. */
export const PEG_TARGET_CHART_TIME_RANGES = [
  "1D",
  "1W",
  "1M",
  "3M",
] as const;

export type PegTargetChartTimeRange =
  (typeof PEG_TARGET_CHART_TIME_RANGES)[number];

export function filterPegChartPointsByRange<T extends { timestamp: number }>(
  points: T[],
  range: PegTargetChartTimeRange,
  nowSec = Math.floor(Date.now() / 1000),
): T[] {
  if (points.length === 0) return [];
  const start = nowSec - sailChartRangeWindowSec(range);
  return points.filter((p) => p.timestamp >= start && p.timestamp <= nowSec);
}

export type PegChartPeriodChanges = {
  change1hPct: number | null;
  change24hPct: number | null;
  changeYtdPct: number | null;
};

/** 1h / 24h / YTD % change vs live (or latest oracle) price. YTD baseline = Jan 1 UTC. */
export function computePegChartPeriodChanges(
  points: PegPricePoint[],
  livePrice: number | null,
  nowSec = Math.floor(Date.now() / 1000),
): PegChartPeriodChanges {
  const current =
    livePrice ??
    (points.length > 0 ? points[points.length - 1]!.priceUsd : null);

  const ytdStart = startOfYearTimestamp(nowSec);
  const ytdBaseline =
    pegPriceAtOrBefore(points, ytdStart) ??
    pegPriceAtOrAfter(points, ytdStart);

  return {
    change1hPct: computePegChangePct(
      pegPriceAtOrBefore(points, nowSec - 3600),
      current,
    ),
    change24hPct: computePegChangePct(
      pegPriceAtOrBefore(points, nowSec - 86400),
      current,
    ),
    changeYtdPct: computePegChangePct(ytdBaseline, current),
  };
}

export function pegChangePctClassName(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct) || pct === 0) {
    return "text-[#1E4775]/70";
  }
  return pct > 0 ? "text-emerald-700" : "text-red-600";
}
