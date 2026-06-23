/**
 * Dashboard metric labels and tooltip copy — single source for Revenue Share clarity.
 */

export type DashboardYieldMetricKey =
  | "mvOwnership"
  | "boost"
  | "yieldPoolPct"
  | "distributed"
  | "pending";

export type DashboardMetricCopy = {
  label: string;
  tip?: string;
  context?: string;
};

export const DASHBOARD_YIELD_METRIC_COPY: Record<
  DashboardYieldMetricKey,
  DashboardMetricCopy
> = {
  mvOwnership: {
    label: "Ownership",
    tip: "Your share of this market's genesis deposit cap.",
  },
  boost: {
    label: "Boost",
    tip: "Maiden Voyage retention multiplier that increases your yield pool weight.",
  },
  yieldPoolPct: {
    label: "Yield pool %",
    tip: "Your boost-weighted share of cumulative maiden-voyage yield for this market.",
  },
  distributed: {
    label: "Distributed",
    tip: "Revenue already paid to your wallet from this market.",
    context: "Paid to wallet",
  },
  pending: {
    label: "Pending",
    tip: "Amount owed but not yet paid; not a scheduled payment date.",
    context: "Not yet paid",
  },
};

export function yieldMetricCopy(key: DashboardYieldMetricKey): DashboardMetricCopy {
  return DASHBOARD_YIELD_METRIC_COPY[key];
}
