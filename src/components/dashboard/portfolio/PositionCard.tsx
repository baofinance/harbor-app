"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { formatUSD } from "@/utils/formatters";
import { DASHBOARD_MANAGE_BUTTON_CLASS, DASHBOARD_POSITION_ACTIONS_CLASS } from "../dashboardDensity";
import { DASHBOARD_MARKET_ICON_PX } from "../dashboardRowListStyles";
import {
  DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS,
  DASHBOARD_POSITION_SUBTITLE_CLASS,
  DASHBOARD_POSITION_TITLE_CLASS,
} from "../dashboardTypography";
import {
  formatMarketLabel,
  parsePositionDetail,
  positionValueContext,
  positionValueLabel,
} from "./dashboardPortfolioUtils";
import {
  PORTFOLIO_POSITION_LABEL_CLASS,
  PORTFOLIO_POSITION_ROW_CLASS,
} from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

const NETWORK_ICON_PX = 16;

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
        <span className="font-normal text-[#1E4775]/40">{positionType}</span>
        <span className="text-[#1E4775]/40"> · </span>
        <span className="font-semibold text-[#1E4775]/65">{positionSubtype}</span>
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
  onManage?: (row: DashboardPositionRow) => void;
};

export function PositionCard({ row, onManage }: PositionCardProps) {
  const { positionType, positionSubtype } = parsePositionDetail(row.detail);
  const valueDisplay = row.usdUnpriced ? "—" : formatUSD(row.usd, { compact: false });
  const marketName = formatMarketLabel(row.marketLabel);
  const valueContext = positionValueContext(row);

  const manageBtn = onManage ? (
    <button
      type="button"
      className={DASHBOARD_MANAGE_BUTTON_CLASS}
      onClick={() => void onManage(row)}
    >
      Manage
      <ChevronRightIcon className="h-3 w-3 shrink-0" aria-hidden />
    </button>
  ) : (
    <Link href={row.href} className={DASHBOARD_MANAGE_BUTTON_CLASS}>
      Manage
      <ChevronRightIcon className="h-3 w-3 shrink-0" aria-hidden />
    </Link>
  );

  return (
    <article
      className={`${PORTFOLIO_POSITION_ROW_CLASS} flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <GenesisMarketChainCell
          chainName={row.chainName}
          chainLogo={row.chainLogo}
          size={NETWORK_ICON_PX}
        />
        <TokenLogo
          symbol={row.iconSymbol}
          size={DASHBOARD_MARKET_ICON_PX}
          className="shrink-0 ring-0"
        />
        <div className="min-w-0 space-y-0">
          <p className={DASHBOARD_POSITION_TITLE_CLASS} title={marketName}>
            {marketName}
          </p>
          <PositionSubtitle
            row={row}
            positionType={positionType}
            positionSubtype={positionSubtype}
          />
        </div>
        <StatusBadge label={row.statusLabel} variant={statusVariant(row.statusTone)} />
      </div>

      <div className={DASHBOARD_POSITION_ACTIONS_CLASS}>
        <div className="space-y-0 sm:text-right sm:tabular-nums">
          <p className={PORTFOLIO_POSITION_LABEL_CLASS}>{positionValueLabel(row.category)}</p>
          {valueContext ? (
            <p className="text-[9px] font-normal normal-case tracking-normal text-[#1E4775]/35 sm:text-right">
              {valueContext}
            </p>
          ) : null}
          <p className={DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS}>{valueDisplay}</p>
        </div>
        {manageBtn}
      </div>
    </article>
  );
}
