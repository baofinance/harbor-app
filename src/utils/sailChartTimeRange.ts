/** Max history window fetched for Sail leverage charts (subgraph + oracles). */
export const SAIL_CHART_HISTORY_DAYS = 366;

export type SailChartTimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

export const SAIL_CHART_TIME_RANGES: readonly SailChartTimeRange[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
];

const DAY_SEC = 24 * 60 * 60;

/** Subgraph + oracle lookback for the selected chart range (small buffer, capped at 1Y). */
export function sailChartFetchDaysForRange(range: SailChartTimeRange): number {
  const windowDays = Math.ceil(sailChartRangeWindowSec(range) / DAY_SEC);
  return Math.min(SAIL_CHART_HISTORY_DAYS, windowDays + 5);
}

export function sailChartRangeWindowSec(range: SailChartTimeRange): number {
  switch (range) {
    case "1D":
      return DAY_SEC;
    case "1W":
      return 7 * DAY_SEC;
    case "1M":
      return 31 * DAY_SEC;
    case "3M":
      return 90 * DAY_SEC;
    case "6M":
      return 180 * DAY_SEC;
    case "1Y":
      return 365 * DAY_SEC;
  }
}

export function filterSailChartPointsByRange<T extends { timestamp: number }>(
  points: T[],
  range: SailChartTimeRange,
): T[] {
  if (points.length === 0) return [];

  const end = points.reduce((max, p) => (p.timestamp > max ? p.timestamp : max), 0);
  if (end <= 0) return points;

  const start = end - sailChartRangeWindowSec(range);
  return points.filter((p) => p.timestamp >= start);
}

export function formatSailChartAxisTimestamp(
  timestamp: number,
  range: SailChartTimeRange,
): string {
  const date = new Date(timestamp * 1000);
  switch (range) {
    case "1D":
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    case "1W":
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "numeric",
        day: "numeric",
      });
    case "1M":
    case "3M":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "6M":
    case "1Y":
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
  }
}
