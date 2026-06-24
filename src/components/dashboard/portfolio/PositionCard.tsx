"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { formatUSD } from "@/utils/formatters";
import {
  DASHBOARD_POSITION_METRIC_LABEL_CLASS,
  DASHBOARD_POSITION_SUBTITLE_CLASS,
  DASHBOARD_POSITION_TITLE_CLASS,
} from "../dashboardTypography";
import {
  formatDashboardPnL,
  formatDashboardPnLPercent,
  formatMarketLabel,
  parsePositionDetail,
  positionValueContext,
  positionValueLabel,
} from "./dashboardPortfolioUtils";
import { DASHBOARD_INSET_MARKET_ICON_PX } from "../dashboardRowListStyles";
import {
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

function PositionSubtitle({
  row,
  positionType,
  positionSubtype,
}: {
  row: DashboardPositionRow;
  positionType: string;
  positionSubtype?: string;
}) {
  if (row.category === "earn" && positionSubtype) {
    return (
      <p className={DASHBOARD_POSITION_SUBTITLE_CLASS} title={`${positionType} · ${positionSubtype}`}>
        <span className="text-[#1E4775]/45">{positionType}</span>
        <span className="text-[#1E4775]/45"> · </span>
        <span className="font-medium text-[#1E4775]/70">{positionSubtype}</span>
      </p>
    );
  }

  const typeLabel = positionSubtype
    ? `${positionType} · ${positionSubtype}`
    : positionType;

  return (
    <p className={DASHBOARD_POSITION_SUBTITLE_CLASS} title={typeLabel}>
      {typeLabel}
    </p>
  );
}

export type PositionCardProps = {
  row: DashboardPositionRow;
};

export function PositionCard({ row }: PositionCardProps) {
  const { positionType, positionSubtype } = parsePositionDetail(row.detail);
  const valueDisplay = row.usdUnpriced ? "—" : formatUSD(row.usd, { compact: false });
  const marketName = formatMarketLabel(row.marketLabel);
  const valueContext = positionValueContext(row);
  const valueLabel = positionValueLabel(row.category);
  const pnlFormatted =
    row.category === "leverage" &&
    row.unrealizedPnLUsd !== undefined &&
    row.unrealizedPnLUsd !== 0
      ? formatDashboardPnL(row.unrealizedPnLUsd)
      : null;

  return (
    <Link
      href={row.href}
      className={`${PORTFOLIO_POSITION_ROW_CLASS} ${DASHBOARD_INSET_ROW_SUBGRID_CLASS} grid grid-cols-1 gap-2 sm:grid-cols-subgrid sm:gap-x-3`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TokenLogo
          symbol={row.iconSymbol}
          size={DASHBOARD_INSET_MARKET_ICON_PX}
          className="shrink-0 ring-0"
        />
        <div className="min-w-0 flex-1 space-y-0">
          <p className={DASHBOARD_POSITION_TITLE_CLASS} title={marketName}>
            {marketName}
          </p>
          <PositionSubtitle
            row={row}
            positionType={positionType}
            positionSubtype={positionSubtype}
          />
        </div>
        <StatusBadge
          label={row.statusLabel}
          variant={statusVariant(row.statusTone)}
        />
      </div>

      <div className="min-w-0 text-left sm:text-right">
        <span className="whitespace-nowrap text-sm">
          <span className={DASHBOARD_POSITION_METRIC_LABEL_CLASS}>{valueLabel}</span>{" "}
          <span className="font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base">
            {valueDisplay}
          </span>
        </span>
        {row.category === "leverage" ? (
          pnlFormatted ? (
            <p className={`mt-0.5 sm:text-right ${pnlFormatted.className}`}>
              {pnlFormatted.text} (
              {formatDashboardPnLPercent(row.unrealizedPnLPercent ?? 0)})
            </p>
          ) : (
            <p className="mt-0.5 font-mono text-sm tabular-nums text-[#1E4775]/40 sm:text-right">
              —
            </p>
          )
        ) : valueContext ? (
          <p className="mt-0.5 text-[10px] text-[#1E4775]/40 sm:text-right">{valueContext}</p>
        ) : null}
      </div>
    </Link>
  );
}
