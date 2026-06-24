"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL } from "@/utils/indexPageManageButton";
import { formatUSD } from "@/utils/formatters";
import {
  DASHBOARD_POSITION_METRIC_LABEL_CLASS,
  DASHBOARD_POSITION_TITLE_CLASS,
} from "../dashboardTypography";
import {
  dashboardPositionStatusLabel,
  formatDashboardPnL,
  formatDashboardPnLPercent,
  formatMarketLabel,
  positionValueContext,
  positionValueLabel,
} from "./dashboardPortfolioUtils";
import { DASHBOARD_INSET_MARKET_ICON_PX } from "../dashboardRowListStyles";
import {
  DASHBOARD_ARCHIVED_POSITION_ROW_CLASS,
  DASHBOARD_INSET_ROW_SUBGRID_CLASS,
  PORTFOLIO_POSITION_ROW_CLASS,
} from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

function statusVariant(
  tone: DashboardPositionRow["statusTone"],
): "active" | "ended" | "neutral" {
  if (tone === "active") return "active";
  if (tone === "ended") return "ended";
  return "neutral";
}

export type PositionCardProps = {
  row: DashboardPositionRow;
  onWithdraw?: (row: DashboardPositionRow) => void;
};

export function PositionCard({ row, onWithdraw }: PositionCardProps) {
  const valueDisplay = row.usdUnpriced ? "—" : formatUSD(row.usd, { compact: false });
  const marketName = formatMarketLabel(row.marketLabel);
  const valueContext = positionValueContext(row);
  const valueLabel = positionValueLabel(row.category);
  const statusLabel = onWithdraw
    ? "Ready to withdraw"
    : dashboardPositionStatusLabel(row);
  const badgeVariant = onWithdraw ? "ended" : statusVariant(row.statusTone);
  const pnlFormatted =
    row.category === "leverage" &&
    row.unrealizedPnLUsd !== undefined &&
    row.unrealizedPnLUsd !== 0
      ? formatDashboardPnL(row.unrealizedPnLUsd)
      : null;

  const valueTitle = [valueContext, row.detail].filter(Boolean).join(" · ");

  const marketCell = (
    <div className="flex min-w-0 items-center gap-2.5">
      <TokenLogo
        symbol={row.iconSymbol}
        size={DASHBOARD_INSET_MARKET_ICON_PX}
        className="shrink-0 ring-0"
      />
      <p
        className={`min-w-0 flex-1 ${DASHBOARD_POSITION_TITLE_CLASS}`}
        title={marketName}
      >
        {marketName}
      </p>
      <StatusBadge label={statusLabel} variant={badgeVariant} />
    </div>
  );

  const valueCell = (
    <div className="min-w-0 text-left sm:text-right">
      <span
        className="whitespace-nowrap text-sm"
        title={valueTitle || undefined}
      >
        <span className={DASHBOARD_POSITION_METRIC_LABEL_CLASS}>{valueLabel}</span>{" "}
        <span className="font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base">
          {valueDisplay}
        </span>
        {pnlFormatted ? (
          <span className={`ml-1 ${pnlFormatted.className}`}>
            ({pnlFormatted.text}{" "}
            {formatDashboardPnLPercent(row.unrealizedPnLPercent ?? 0)})
          </span>
        ) : null}
      </span>
    </div>
  );

  if (onWithdraw) {
    return (
      <div className={`${PORTFOLIO_POSITION_ROW_CLASS} ${DASHBOARD_ARCHIVED_POSITION_ROW_CLASS}`}>
        {marketCell}
        {valueCell}
        <div className="flex justify-start sm:justify-end">
          <button
            type="button"
            className={`${INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL} !min-w-[5.25rem] px-3 py-1.5 text-[10px] sm:!min-w-[5.75rem] sm:py-2 sm:text-xs`}
            onClick={() => void onWithdraw(row)}
          >
            Withdraw
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={row.href}
      className={`${PORTFOLIO_POSITION_ROW_CLASS} ${DASHBOARD_INSET_ROW_SUBGRID_CLASS} grid grid-cols-1 items-center gap-2 sm:grid-cols-subgrid sm:gap-x-3`}
    >
      {marketCell}
      {valueCell}
    </Link>
  );
}
