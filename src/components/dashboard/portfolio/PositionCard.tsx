"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { INDEX_MANAGE_BUTTON_CLASS_COMPACT } from "@/utils/indexPageManageButton";
import { formatUSD } from "@/utils/formatters";
import {
  formatMarketLabel,
  parsePositionDetail,
  positionValueLabel,
} from "./dashboardPortfolioUtils";
import {
  PORTFOLIO_POSITION_LABEL_CLASS,
  PORTFOLIO_POSITION_ROW_CLASS,
} from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

const NETWORK_ICON_PX = 14;
const MARKET_ICON_PX = 20;

function statusVariant(
  tone: DashboardPositionRow["statusTone"],
): "active" | "ended" | "neutral" {
  if (tone === "active") return "active";
  if (tone === "ended") return "ended";
  return "neutral";
}

export type PositionCardProps = {
  row: DashboardPositionRow;
  onManage?: (row: DashboardPositionRow) => void;
};

export function PositionCard({ row, onManage }: PositionCardProps) {
  const { positionType, positionSubtype } = parsePositionDetail(row.detail);
  const valueDisplay = row.usdUnpriced ? "—" : formatUSD(row.usd, { compact: false });
  const marketName = formatMarketLabel(row.marketLabel);
  const typeLabel = positionSubtype
    ? `${positionType} · ${positionSubtype}`
    : positionType;

  const manageBtn = onManage ? (
    <button
      type="button"
      className={`${INDEX_MANAGE_BUTTON_CLASS_COMPACT} inline-flex items-center gap-0.5`}
      onClick={() => void onManage(row)}
    >
      Manage
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </button>
  ) : (
    <Link
      href={row.href}
      className={`${INDEX_MANAGE_BUTTON_CLASS_COMPACT} inline-flex items-center gap-0.5`}
    >
      Manage
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </Link>
  );

  return (
    <article
      className={`${PORTFOLIO_POSITION_ROW_CLASS} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GenesisMarketChainCell
          chainName={row.chainName}
          chainLogo={row.chainLogo}
          size={NETWORK_ICON_PX}
        />
        <TokenLogo symbol={row.iconSymbol} size={MARKET_ICON_PX} className="shrink-0 ring-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1E4775]" title={marketName}>
            {marketName}
          </p>
          <p className={`truncate text-xs text-[#1E4775]/55`} title={typeLabel}>
            {typeLabel}
          </p>
        </div>
        <StatusBadge label={row.statusLabel} variant={statusVariant(row.statusTone)} />
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <div className="sm:text-right">
          <p className={PORTFOLIO_POSITION_LABEL_CLASS}>{positionValueLabel(row.category)}</p>
          <p className="font-mono text-base font-semibold tabular-nums text-[#1E4775]">
            {valueDisplay}
          </p>
        </div>
        {manageBtn}
      </div>
    </article>
  );
}
