"use client";

import { GenesisMarketChainCell } from "@/components/genesis/GenesisMarketSharedRowCells";
import { chainFromMarketId } from "@/components/dashboard/dashboardRowPresentation";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { DashboardYieldBoostBadge } from "../DashboardYieldBoostBadge";
import { PORTFOLIO_CARD_SHELL, PORTFOLIO_LABEL_CLASS, PORTFOLIO_MUTED_CLASS } from "./portfolioStyles";
import { StatusBadge } from "./StatusBadge";

const NETWORK_ICON_PX = 16;

export function YieldSharePositionCard({ row }: { row: FounderMetricRow }) {
  const { chainName, chainLogo } = chainFromMarketId(row.marketId);
  const showBoost = row.ownershipSharePct > 0;

  return (
    <article className={`${PORTFOLIO_CARD_SHELL} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-3.5`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GenesisMarketChainCell
          chainName={chainName}
          chainLogo={chainLogo}
          size={NETWORK_ICON_PX}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1E4775]" title={row.marketName}>
            {row.marketName}
          </p>
          <p className={`truncate ${PORTFOLIO_MUTED_CLASS} text-[#1E4775]/55`}>Yield share</p>
        </div>
        {row.outstandingUSD > 0 ? (
          <StatusBadge label="Uncollected" variant="coral" />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-end sm:justify-end sm:gap-x-5 sm:gap-y-1">
        <Metric label="MV ownership" value={formatPercent(row.ownershipSharePct, { decimals: 2 })} />
        <div className="min-w-0">
          <p className={PORTFOLIO_LABEL_CLASS}>Boost</p>
          <div className="mt-0.5">
            {showBoost ? (
              <DashboardYieldBoostBadge multiplier={row.boostMultiplier} />
            ) : (
              <span className="text-sm text-[#1E4775]/40">—</span>
            )}
          </div>
        </div>
        <Metric label="Yield pool %" value={formatPercent(row.yieldSharePct, { decimals: 4 })} />
        <Metric label="Total paid" value={formatUSD(row.paidUSD, { compact: false })} />
        <div className="min-w-0">
          <p className={PORTFOLIO_LABEL_CLASS}>Uncollected</p>
          <p
            className={`mt-0.5 font-mono text-sm font-bold tabular-nums sm:text-base ${
              row.outstandingUSD > 0 ? "text-[#FF8A7A]" : "text-[#1E4775]"
            }`}
          >
            {formatUSD(row.outstandingUSD, { compact: false })}
          </p>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={`${PORTFOLIO_LABEL_CLASS} text-[#1E4775]/55`}>{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-[#1E4775]">
        {value}
      </p>
    </div>
  );
}
