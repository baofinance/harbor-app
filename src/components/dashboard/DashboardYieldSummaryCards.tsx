"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import {
  DASHBOARD_METRIC_CHIP_VALUE_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRICS_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_YIELD_CLASS,
} from "./dashboardStyles";

export type DashboardYieldSummaryCardsProps = {
  totalEarned: number;
  totalOutstanding: number;
  isConnected: boolean;
  /** Flat text metrics for product card headers; frosted chips for page-level strips. */
  variant?: "chip" | "flat";
  /** Horizontal scroll on narrow viewports (page-level stat strip). */
  scroll?: boolean;
  /** Render chips only — for embedding in a shared stat strip. */
  bare?: boolean;
};

function StatIconBadge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`${className} !h-7 !w-7 sm:!h-8 sm:!w-8`} aria-hidden>
      {children}
    </span>
  );
}

function FlatYieldMetric({
  label,
  value,
  valueClassName = DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 text-left">
      <p className={DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS}>{label}</p>
      <p className={`mt-0.5 truncate ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function DashboardYieldSummaryCards({
  totalEarned,
  totalOutstanding,
  isConnected,
  variant = "chip",
  scroll = false,
  bare = false,
}: DashboardYieldSummaryCardsProps) {
  const dash = "—";
  const earnedValue = isConnected ? formatUSD(totalEarned, { compact: false }) : dash;
  const outstandingValue = isConnected
    ? formatUSD(totalOutstanding, { compact: false })
    : dash;

  if (variant === "flat") {
    return (
      <div className={DASHBOARD_PRODUCT_HEADER_METRICS_CLASS}>
        <FlatYieldMetric
          label="Total earned"
          value={earnedValue}
          valueClassName={
            isConnected && totalEarned > 0
              ? "font-mono text-sm tabular-nums font-semibold text-[#B8EBD5] sm:text-base"
              : DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS
          }
        />
        <FlatYieldMetric
          label="Uncollected"
          value={outstandingValue}
          valueClassName={
            isConnected && totalOutstanding > 0
              ? "font-mono text-sm tabular-nums font-semibold text-[#FF8A7A] sm:text-base"
              : DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS
          }
        />
      </div>
    );
  }

  const chips = (
    <>
      <DashboardMetricChip
        label="Total earned"
        value={earnedValue}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_EARN_CLASS}>
            <ChartBarIcon className="h-4 w-4" />
          </StatIconBadge>
        }
        valueClassName={
          isConnected && totalEarned > 0
            ? "text-[#B8EBD5]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
      />
      <DashboardMetricChip
        label="Uncollected"
        value={outstandingValue}
        valueClassName={
          isConnected && totalOutstanding > 0
            ? "text-[#FF8A7A]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_YIELD_CLASS}>
            <ChartBarIcon className="h-4 w-4" />
          </StatIconBadge>
        }
      />
    </>
  );

  if (bare) return chips;

  return (
    <DashboardMetricStrip inline scroll={scroll}>
      {chips}
    </DashboardMetricStrip>
  );
}
