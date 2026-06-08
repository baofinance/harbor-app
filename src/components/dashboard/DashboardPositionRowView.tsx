"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/shared";
import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import {
  INDEX_MANAGE_BUTTON_CLASS_DESKTOP,
  INDEX_MANAGE_BUTTON_CLASS_RESPONSIVE,
} from "@/utils/indexPageManageButton";
import { formatUSD } from "@/utils/formatters";
import { DashboardStatusPill } from "./DashboardStatusPill";
import {
  DASHBOARD_GLASS_VALUE_TEXT_CLASS,
  DASHBOARD_INDEX_ROW_DESKTOP_CLASS,
  DASHBOARD_INDEX_ROW_MOBILE_CLASS,
  DASHBOARD_PANEL_ROW_SHELL_CLASS,
  DASHBOARD_MARKET_ICON_PX,
  DASHBOARD_POSITIONS_ACTION_FOOTPRINT_CLASSNAME,
  DASHBOARD_POSITIONS_COL_ACTION_CLASSNAME,
  DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME,
  DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME,
  DASHBOARD_POSITIONS_COL_NOTIONAL_CLASSNAME,
  DASHBOARD_POSITIONS_COL_TYPE_CLASSNAME,
} from "./dashboardRowListStyles";

const DASHBOARD_NETWORK_ICON_PX = DASHBOARD_MARKET_ICON_PX;

function ManageAction({
  row,
  onManage,
  className = INDEX_MANAGE_BUTTON_CLASS_RESPONSIVE,
}: {
  row: DashboardPositionRow;
  onManage?: (row: DashboardPositionRow) => void;
  className?: string;
}) {
  if (onManage) {
    return (
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          void onManage(row);
        }}
      >
        Manage
      </button>
    );
  }

  return (
    <Link href={row.href} className={className}>
      Manage
    </Link>
  );
}

export type DashboardPositionRowViewProps = {
  row: DashboardPositionRow;
  onManage?: (row: DashboardPositionRow) => void;
};

function formatPositionNotional(row: DashboardPositionRow): string {
  if (row.usdUnpriced) return "—";
  return formatUSD(row.usd, { compact: false });
}

export function DashboardPositionRowView({
  row,
  onManage,
}: DashboardPositionRowViewProps) {
  const notionalDisplay = formatPositionNotional(row);

  return (
    <div className={DASHBOARD_PANEL_ROW_SHELL_CLASS}>
      {/* Mobile — network + market left, Manage top-right, notional below. */}
      <div className={DASHBOARD_INDEX_ROW_MOBILE_CLASS}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <GenesisMarketChainCell
              chainName={row.chainName}
              chainLogo={row.chainLogo}
              size={DASHBOARD_NETWORK_ICON_PX}
            />
            <TokenLogo symbol={row.iconSymbol} size={DASHBOARD_MARKET_ICON_PX} className="shrink-0 ring-0" />
            <span className={`min-w-0 truncate ${DASHBOARD_GLASS_VALUE_TEXT_CLASS}`}>
              {row.marketLabel}
            </span>
            <DashboardStatusPill
              label={row.statusLabel}
              tone={row.statusTone}
              surface="glass"
            />
          </div>
          <div className="flex shrink-0 items-center justify-end">
            <ManageAction
              row={row}
              onManage={onManage}
              className={INDEX_MANAGE_BUTTON_CLASS_DESKTOP}
            />
          </div>
        </div>
        <div className={`${DASHBOARD_GLASS_VALUE_TEXT_CLASS} tabular-nums`}>
          {notionalDisplay}
        </div>
      </div>

      {/* Desktop — Genesis explorer grid alignment */}
      <div className={DASHBOARD_INDEX_ROW_DESKTOP_CLASS}>
        <div className={DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME}>
          <GenesisMarketChainCell
            chainName={row.chainName}
            chainLogo={row.chainLogo}
            size={DASHBOARD_NETWORK_ICON_PX}
          />
        </div>
        <div className={DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME}>
          <TokenLogo symbol={row.iconSymbol} size={DASHBOARD_MARKET_ICON_PX} className="shrink-0 ring-0" />
          <span className={`${DASHBOARD_GLASS_VALUE_TEXT_CLASS} truncate`} title={row.marketLabel}>
            {row.marketLabel}
          </span>
        </div>
        <div className={DASHBOARD_POSITIONS_COL_TYPE_CLASSNAME}>
          <DashboardStatusPill
            label={row.statusLabel}
            tone={row.statusTone}
            surface="glass"
          />
        </div>
        <div className={DASHBOARD_POSITIONS_COL_NOTIONAL_CLASSNAME}>
          <span className={`${DASHBOARD_GLASS_VALUE_TEXT_CLASS} truncate`}>
            {notionalDisplay}
          </span>
        </div>
        <div className={DASHBOARD_POSITIONS_COL_ACTION_CLASSNAME}>
          <div className={DASHBOARD_POSITIONS_ACTION_FOOTPRINT_CLASSNAME}>
            <ManageAction row={row} onManage={onManage} />
          </div>
        </div>
      </div>
    </div>
  );
}
