"use client";

import type { ReactNode } from "react";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import { chainFromMarketId } from "@/components/dashboard/dashboardRowPresentation";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DashboardContentRow, DashboardContentRowSkeleton } from "./DashboardContentRow";
import { DashboardMarketColumnHeader } from "./DashboardMarketColumnHeader";
import {
  DashboardYieldBoostColumnHeader,
  DashboardYieldCenteredMetricHeader,
} from "./DashboardYieldColumnHeaders";
import { DashboardYieldBoostBadge } from "./DashboardYieldBoostBadge";
import { DASHBOARD_LINK_CLASS } from "./dashboardStyles";
import {
  DASHBOARD_EMPTY_ON_PANEL_CLASS,
  DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME,
  DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME,
  DASHBOARD_POSITIONS_TABLE_HEADER_WRAP_CLASSNAME,
  DASHBOARD_POSITIONS_VALUE_TEXT_CLASS,
  DASHBOARD_YIELD_COL_BOOST_CLASSNAME,
  DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME,
  DASHBOARD_YIELD_LIST_CLASS,
  DASHBOARD_YIELD_ROW_GRID_CLASS,
  DASHBOARD_YIELD_TABLE_HEADER_GRID_CLASSNAME,
  DASHBOARD_YIELD_TABLE_MIN_WIDTH_CLASSNAME,
  DASHBOARD_YIELD_TABLE_SCROLL_WRAP_CLASSNAME,
} from "./dashboardRowListStyles";

const DASHBOARD_NETWORK_ICON_PX = 20;

function YieldListHeader() {
  return (
    <div className={DASHBOARD_POSITIONS_TABLE_HEADER_WRAP_CLASSNAME}>
      <div className={DASHBOARD_YIELD_TABLE_HEADER_GRID_CLASSNAME}>
        <div className={DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME} aria-label="Network" />
        <DashboardMarketColumnHeader showIcon={false} />
        <DashboardYieldCenteredMetricHeader
          label="MV ownership"
          tip="Your share of the genesis deposit cap for this market (indexer)."
          ghostValue="2.71%"
        />
        <DashboardYieldBoostColumnHeader tip="Maiden Voyage retention multiplier for this market (indexer)." />
        <DashboardYieldCenteredMetricHeader
          label="Yield pool %"
          tip="Boost-weighted share used to split cumulative maiden-voyage yield."
          ghostValue="16.8916%"
        />
        <DashboardYieldCenteredMetricHeader label="Total paid" ghostValue="$0" />
        <DashboardYieldCenteredMetricHeader
          label="Uncollected"
          tip="Amount still owed versus payouts on file; not a scheduled payment date."
          ghostValue="$3.97"
        />
      </div>
    </div>
  );
}

function YieldTable({ children }: { children: ReactNode }) {
  return (
    <div className={DASHBOARD_YIELD_TABLE_SCROLL_WRAP_CLASSNAME}>
      <div className={`${DASHBOARD_YIELD_TABLE_MIN_WIDTH_CLASSNAME} space-y-2`}>
        <YieldListHeader />
        {children}
      </div>
    </div>
  );
}

function DashboardYieldRowView({ row }: { row: FounderMetricRow }) {
  const { chainName, chainLogo } = chainFromMarketId(row.marketId);
  const showBoost = row.ownershipSharePct > 0;

  return (
    <DashboardContentRow variant="index">
      <div className={DASHBOARD_YIELD_ROW_GRID_CLASS}>
        <div className={DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME}>
          <GenesisMarketChainCell
            chainName={chainName}
            chainLogo={chainLogo}
            size={DASHBOARD_NETWORK_ICON_PX}
          />
        </div>
        <div className={DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME}>
          <span
            className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} truncate`}
            title={row.marketName}
          >
            {row.marketName}
          </span>
        </div>
        <div className={DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME}>
          <span className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} tabular-nums`}>
            {formatPercent(row.ownershipSharePct, { decimals: 2 })}
          </span>
        </div>
        <div className={DASHBOARD_YIELD_COL_BOOST_CLASSNAME}>
          {showBoost ? (
            <DashboardYieldBoostBadge multiplier={row.boostMultiplier} />
          ) : (
            <span className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} text-[#1E4775]/40`}>—</span>
          )}
        </div>
        <div className={DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME}>
          <span className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} tabular-nums`}>
            {formatPercent(row.yieldSharePct, { decimals: 4 })}
          </span>
        </div>
        <div className={DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME}>
          <span className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} tabular-nums`}>
            {formatUSD(row.paidUSD, { compact: false })}
          </span>
        </div>
        <div className={DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME}>
          <span
            className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} tabular-nums ${
              row.outstandingUSD > 0 ? "text-[#FF8A7A]" : ""
            }`}
          >
            {formatUSD(row.outstandingUSD, { compact: false })}
          </span>
        </div>
      </div>
    </DashboardContentRow>
  );
}

export type DashboardYieldShareListProps = {
  rows: FounderMetricRow[];
  isLoading: boolean;
  error: string | null;
};

export function DashboardYieldShareList({
  rows,
  isLoading,
  error,
}: DashboardYieldShareListProps) {
  if (error) {
    return <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>{error}</p>;
  }

  if (isLoading) {
    return (
      <div className={DASHBOARD_YIELD_LIST_CLASS}>
        <YieldTable>
          {[0, 1, 2].map((i) => (
            <DashboardContentRowSkeleton key={i} variant="index" />
          ))}
        </YieldTable>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>
        No yield share rows for this wallet. If you have deposits, check{" "}
        <a href="/genesis" className={DASHBOARD_LINK_CLASS}>
          Maiden voyage
        </a>{" "}
        after genesis ends so final ownership is written on-chain.
      </p>
    );
  }

  return (
    <div className={DASHBOARD_YIELD_LIST_CLASS}>
      <YieldTable>
        {rows.map((row) => (
          <DashboardYieldRowView key={row.marketId} row={row} />
        ))}
      </YieldTable>
    </div>
  );
}
