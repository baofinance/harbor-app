"use client";

import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import SimpleTooltip from "@/components/SimpleTooltip";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DASHBOARD_INDEX_TABLE_HEAD } from "./dashboardStyles";
import {
  DASHBOARD_EMPTY_ON_PANEL_CLASS,
  DASHBOARD_PANEL_ROW_SHELL_CLASS,
  DASHBOARD_SKELETON_BAR_CLASS,
  DASHBOARD_TABLE_HEADER_WRAP_CLASS,
  DASHBOARD_YIELD_HEADER_GRID_CLASS,
  DASHBOARD_YIELD_LIST_CLASS,
  DASHBOARD_YIELD_ROW_GRID_CLASS,
} from "./dashboardRowListStyles";

function formatMaidenVoyageBoost(mult: number | null): string {
  if (mult == null) return "—";
  const rounded = Math.round(mult * 100) / 100;
  const frac = rounded % 1;
  const s = frac === 0 ? String(rounded) : rounded.toFixed(2);
  return `${s}×`;
}

function HeaderCellWithTip({
  label,
  tip,
  align = "right",
}: {
  label: string;
  tip: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <SimpleTooltip label={tip} className="cursor-help">
        <span className={`inline-flex items-center gap-1 ${DASHBOARD_INDEX_TABLE_HEAD}`}>
          <span className="truncate">{label}</span>
          <span className="text-[#1E4775]/40 normal-case shrink-0">ⓘ</span>
        </span>
      </SimpleTooltip>
    </div>
  );
}

function YieldListHeader() {
  return (
    <div className={DASHBOARD_TABLE_HEADER_WRAP_CLASS}>
      <div className="overflow-x-auto">
        <div className={DASHBOARD_YIELD_HEADER_GRID_CLASS}>
          <div className="min-w-0 truncate text-left">Market</div>
          <HeaderCellWithTip
            label="MV ownership"
            tip="Your share of the genesis deposit cap for this market (indexer)."
          />
          <HeaderCellWithTip
            label="Boost"
            tip="Maiden Voyage retention multiplier for this market (indexer)."
          />
          <HeaderCellWithTip
            label="Yield pool %"
            tip="Boost-weighted share used to split cumulative maiden-voyage yield."
          />
          <div className="min-w-0 truncate text-right">Total paid</div>
          <HeaderCellWithTip
            label="Uncollected"
            tip="Amount still owed versus payouts on file; not a scheduled payment date."
          />
        </div>
      </div>
    </div>
  );
}

function YieldRowSkeleton() {
  return (
    <div className={DASHBOARD_PANEL_ROW_SHELL_CLASS}>
      <div className="overflow-x-auto px-1">
        <div className={DASHBOARD_SKELETON_BAR_CLASS} />
      </div>
    </div>
  );
}

function DashboardYieldRow({ row }: { row: FounderMetricRow }) {
  return (
    <div className={DASHBOARD_PANEL_ROW_SHELL_CLASS}>
      <div className="overflow-x-auto px-1">
        <div className={DASHBOARD_YIELD_ROW_GRID_CLASS}>
          <div className="min-w-0 truncate text-[#1E4775]">{row.marketName}</div>
          <div className="min-w-0 text-right tabular-nums text-[#1E4775]">
            {formatPercent(row.ownershipSharePct, { decimals: 2 })}
          </div>
          <div className="min-w-0 text-right tabular-nums text-[#1E4775]">
            {row.ownershipSharePct > 0
              ? formatMaidenVoyageBoost(row.boostMultiplier)
              : "—"}
          </div>
          <div className="min-w-0 text-right tabular-nums text-[#1E4775]">
            {formatPercent(row.yieldSharePct, { decimals: 4 })}
          </div>
          <div className="min-w-0 text-right tabular-nums text-[#1E4775]">
            {formatUSD(row.paidUSD, { compact: false })}
          </div>
          <div className="min-w-0 text-right tabular-nums text-[#1E4775]">
            {formatUSD(row.outstandingUSD, { compact: false })}
          </div>
        </div>
      </div>
    </div>
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
        <YieldListHeader />
        {[0, 1, 2].map((i) => (
          <YieldRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className={DASHBOARD_EMPTY_ON_PANEL_CLASS}>
        No yield share rows for this wallet. If you have deposits, check{" "}
        <a
          href="/genesis"
          className="font-medium text-[#1E4775] underline underline-offset-2 hover:text-[#153B63]"
        >
          Maiden voyage
        </a>{" "}
        after genesis ends so final ownership is written on-chain.
      </p>
    );
  }

  return (
    <div className={DASHBOARD_YIELD_LIST_CLASS}>
      <YieldListHeader />
      {rows.map((row) => (
        <DashboardYieldRow key={row.marketId} row={row} />
      ))}
    </div>
  );
}
