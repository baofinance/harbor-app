"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import { iconSymbolFromMarketLabel } from "@/components/dashboard/dashboardRowPresentation";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DashboardYieldBoostBadge } from "../DashboardYieldBoostBadge";
import {
  DASHBOARD_POSITION_METRIC_LABEL_CLASS,
  DASHBOARD_POSITION_METRIC_VALUE_CLASS,
  DASHBOARD_POSITION_TITLE_CLASS,
} from "../dashboardTypography";
import { DASHBOARD_INSET_MARKET_ICON_PX } from "../dashboardRowListStyles";
import { formatDashboardEarnedUsd, formatMarketLabel } from "./dashboardPortfolioUtils";
import {
  DASHBOARD_INSET_ROW_SUBGRID_CLASS,
  PORTFOLIO_POSITION_ROW_CLASS,
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
      <span className={DASHBOARD_POSITION_METRIC_LABEL_CLASS}>{label}</span>{" "}
      <span
        className={
          valueClassName ??
          `${DASHBOARD_POSITION_METRIC_VALUE_CLASS} font-semibold`
        }
      >
        {value}
      </span>
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
      className={`${PORTFOLIO_POSITION_ROW_CLASS} ${DASHBOARD_INSET_ROW_SUBGRID_CLASS} grid grid-cols-1 items-center gap-2 sm:grid-cols-subgrid sm:gap-x-3`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TokenLogo
          symbol={iconSymbol}
          size={DASHBOARD_INSET_MARKET_ICON_PX}
          className="shrink-0 ring-0"
        />
        <p className={DASHBOARD_POSITION_TITLE_CLASS} title={marketName}>
          {marketName}
        </p>
      </div>

      <InlineMetric
        label="Pending"
        value={formatDashboardEarnedUsd(row.outstandingUSD)}
        valueClassName={
          hasPending
            ? `${DASHBOARD_POSITION_METRIC_VALUE_CLASS} font-semibold text-harbor-coral`
            : `${DASHBOARD_POSITION_METRIC_VALUE_CLASS} text-harbor-blue/40`
        }
      />

      <InlineMetric
        label="Ownership"
        value={formatPercent(row.ownershipSharePct, { decimals: 2 })}
        title="Your share of this market's genesis deposit cap."
      />

      <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm">
        <span className={DASHBOARD_POSITION_METRIC_LABEL_CLASS}>Boost</span>
        {showBoost ? (
          <DashboardYieldBoostBadge multiplier={row.boostMultiplier} />
        ) : (
          <span className={`${DASHBOARD_POSITION_METRIC_VALUE_CLASS} text-harbor-blue/40`}>
            —
          </span>
        )}
      </span>

      <InlineMetric
        label="Distributed"
        value={formatUSD(row.paidUSD, { compact: false })}
        valueClassName={
          row.paidUSD > 0
            ? `${DASHBOARD_POSITION_METRIC_VALUE_CLASS} font-semibold`
            : `${DASHBOARD_POSITION_METRIC_VALUE_CLASS} text-harbor-blue/40`
        }
      />
    </Link>
  );
}
