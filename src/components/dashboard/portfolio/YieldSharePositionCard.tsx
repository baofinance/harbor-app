"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import { iconSymbolFromMarketLabel } from "@/components/dashboard/dashboardRowPresentation";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DASHBOARD_YIELD_ROW_PENDING_CLASS } from "../dashboardBrand";
import { DashboardYieldBoostBadge } from "../DashboardYieldBoostBadge";
import {
  DASHBOARD_INSET_METRIC_CORAL_CLASS,
  DASHBOARD_INSET_METRIC_LABEL_CLASS,
  DASHBOARD_INSET_METRIC_MUTED_CLASS,
  DASHBOARD_INSET_METRIC_VALUE_CLASS,
  DASHBOARD_INSET_TITLE_CLASS,
} from "../dashboardTypography";
import { DASHBOARD_INSET_MARKET_ICON_PX } from "../dashboardRowListStyles";
import { formatDashboardEarnedUsd, formatMarketLabel } from "./dashboardPortfolioUtils";
import {
  DASHBOARD_INSET_ROW_SHELL_CLASS,
  DASHBOARD_INSET_ROW_SUBGRID_CLASS,
} from "./portfolioStyles";

function InlineMetric({
  label,
  value,
  valueClassName,
  title,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  title?: string;
}) {
  return (
    <span className="whitespace-nowrap text-sm" title={title}>
      <span className={DASHBOARD_INSET_METRIC_LABEL_CLASS}>{label}</span>{" "}
      <span className={valueClassName ?? DASHBOARD_INSET_METRIC_VALUE_CLASS}>{value}</span>
    </span>
  );
}

export function YieldSharePositionCard({ row }: { row: FounderMetricRow }) {
  const showBoost = row.ownershipSharePct > 0;
  const hasPending = row.outstandingUSD > 0;
  const marketName = formatMarketLabel(row.marketName);
  const iconSymbol = iconSymbolFromMarketLabel(row.marketName);
  const href = `/genesis/${row.marketId}`;

  return (
    <Link
      href={href}
      className={`${DASHBOARD_INSET_ROW_SHELL_CLASS} ${DASHBOARD_INSET_ROW_SUBGRID_CLASS} grid-cols-1 gap-2 sm:gap-x-3 ${
        hasPending ? DASHBOARD_YIELD_ROW_PENDING_CLASS : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TokenLogo
          symbol={iconSymbol}
          size={DASHBOARD_INSET_MARKET_ICON_PX}
          className="shrink-0 ring-0"
        />
        <p className={DASHBOARD_INSET_TITLE_CLASS} title={marketName}>
          {marketName}
        </p>
      </div>

      <InlineMetric
        label="Pending"
        value={formatDashboardEarnedUsd(row.outstandingUSD)}
        valueClassName={
          hasPending
            ? DASHBOARD_INSET_METRIC_CORAL_CLASS
            : DASHBOARD_INSET_METRIC_MUTED_CLASS
        }
      />

      <InlineMetric
        label="Ownership"
        value={formatPercent(row.ownershipSharePct, { decimals: 2 })}
        title="Your share of this market's genesis deposit cap."
      />

      <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm">
        <span className={DASHBOARD_INSET_METRIC_LABEL_CLASS}>Boost</span>
        {showBoost ? (
          <DashboardYieldBoostBadge multiplier={row.boostMultiplier} surface="dark" />
        ) : (
          <span className={DASHBOARD_INSET_METRIC_MUTED_CLASS}>—</span>
        )}
      </span>

      <InlineMetric
        label="Distributed"
        value={formatUSD(row.paidUSD, { compact: false })}
        valueClassName={
          row.paidUSD > 0
            ? DASHBOARD_INSET_METRIC_VALUE_CLASS
            : DASHBOARD_INSET_METRIC_MUTED_CLASS
        }
      />
    </Link>
  );
}
