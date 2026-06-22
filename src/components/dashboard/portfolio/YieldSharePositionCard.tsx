"use client";

import { TokenLogo } from "@/components/shared";
import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import {
  chainFromMarketId,
  iconSymbolFromMarketLabel,
} from "@/components/dashboard/dashboardRowPresentation";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DASHBOARD_YIELD_ROW_PENDING_CLASS } from "../dashboardBrand";
import { DashboardMetricLabel } from "../DashboardMetricLabel";
import { yieldMetricCopy } from "../dashboardMetricCopy";
import { DashboardYieldBoostBadge } from "../DashboardYieldBoostBadge";
import { DASHBOARD_MARKET_ICON_PX } from "../dashboardRowListStyles";
import {
  DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS,
  DASHBOARD_NUMERIC_ROW_SECONDARY_CLASS,
  DASHBOARD_POSITION_SUBTITLE_CLASS,
  DASHBOARD_POSITION_TITLE_CLASS,
} from "../dashboardTypography";
import { formatDashboardEarnedUsd, formatMarketLabel } from "./dashboardPortfolioUtils";
import { PORTFOLIO_POSITION_ROW_CLASS } from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

const NETWORK_ICON_PX = 16;

export function YieldSharePositionCard({ row }: { row: FounderMetricRow }) {
  const { chainName, chainLogo } = chainFromMarketId(row.marketId);
  const showBoost = row.ownershipSharePct > 0;
  const hasPending = row.outstandingUSD > 0;
  const marketName = formatMarketLabel(row.marketName);
  const iconSymbol = iconSymbolFromMarketLabel(row.marketName);

  const boostCopy = yieldMetricCopy("boost");
  const pendingCopy = yieldMetricCopy("pending");
  const mvCopy = yieldMetricCopy("mvOwnership");
  const poolCopy = yieldMetricCopy("yieldPoolPct");
  const distributedCopy = yieldMetricCopy("distributed");

  return (
    <article
      className={`${PORTFOLIO_POSITION_ROW_CLASS} flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
        hasPending
          ? `${DASHBOARD_YIELD_ROW_PENDING_CLASS} border-l-2 border-l-[#FF8A7A]/35`
          : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <GenesisMarketChainCell
          chainName={chainName}
          chainLogo={chainLogo}
          size={NETWORK_ICON_PX}
        />
        <TokenLogo
          symbol={iconSymbol}
          size={DASHBOARD_MARKET_ICON_PX}
          className="shrink-0 ring-0"
        />
        <div className="min-w-0 flex-1 space-y-0">
          <p className={DASHBOARD_POSITION_TITLE_CLASS} title={marketName}>
            {marketName}
          </p>
          <p className={DASHBOARD_POSITION_SUBTITLE_CLASS}>Revenue share</p>
        </div>
        {hasPending ? (
          <StatusBadge label="Pending distribution" variant="coral" />
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end sm:gap-4">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
          <div className="min-w-0 space-y-0">
            <DashboardMetricLabel label={boostCopy.label} tip={boostCopy.tip} />
            <div className="mt-0.5">
              {showBoost ? (
                <DashboardYieldBoostBadge multiplier={row.boostMultiplier} />
              ) : (
                <span className="text-xs text-[#1E4775]/40">—</span>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-0">
            <DashboardMetricLabel
              label={pendingCopy.label}
              tip={pendingCopy.tip}
              context={pendingCopy.context}
            />
            <p
              className={`truncate ${
                hasPending
                  ? DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS
                  : DASHBOARD_NUMERIC_ROW_SECONDARY_CLASS
              } ${hasPending ? "text-[#FF8A7A]" : "text-[#1E4775]/40"}`}
            >
              {formatDashboardEarnedUsd(row.outstandingUSD)}
            </p>
          </div>
        </div>

        <div
          className="hidden h-8 border-l border-[#1E4775]/15 sm:block"
          aria-hidden
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:items-end sm:gap-x-3">
          <Metric
            label={mvCopy.label}
            tip={mvCopy.tip}
            value={formatPercent(row.ownershipSharePct, { decimals: 2 })}
          />
          <Metric
            label={poolCopy.label}
            tip={poolCopy.tip}
            value={formatPercent(row.yieldSharePct, { decimals: 4 })}
          />
          <Metric
            label={distributedCopy.label}
            tip={distributedCopy.tip}
            context={distributedCopy.context}
            value={formatUSD(row.paidUSD, { compact: false })}
          />
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  tip,
  context,
  value,
}: {
  label: string;
  tip?: string;
  context?: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-0">
      <DashboardMetricLabel label={label} tip={tip} context={context} />
      <p className={`truncate ${DASHBOARD_NUMERIC_ROW_SECONDARY_CLASS}`}>{value}</p>
    </div>
  );
}
