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
import { PORTFOLIO_CARD_SHELL, PORTFOLIO_LABEL_CLASS, PORTFOLIO_MUTED_CLASS } from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

const NETWORK_ICON_PX = 16;
const MARKET_ICON_PX = 22;

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
    <article className={`${PORTFOLIO_CARD_SHELL} flex flex-col gap-3 p-3 sm:p-3.5`}>
      <div className="flex items-start justify-between gap-2">
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
            <p className={`truncate ${PORTFOLIO_MUTED_CLASS} text-[#1E4775]/55`} title={typeLabel}>
              {typeLabel}
            </p>
          </div>
        </div>
        <StatusBadge label={row.statusLabel} variant={statusVariant(row.statusTone)} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={PORTFOLIO_LABEL_CLASS}>{positionValueLabel(row.category)}</p>
          <p className="font-mono text-lg font-bold tabular-nums text-[#1E4775]">{valueDisplay}</p>
        </div>
        {manageBtn}
      </div>
    </article>
  );
}
