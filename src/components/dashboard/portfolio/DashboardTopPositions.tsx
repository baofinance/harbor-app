"use client";

import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { formatUSD } from "@/utils/formatters";
import { formatMarketLabel } from "./dashboardPortfolioUtils";
import {
  DASHBOARD_INTELLIGENCE_CARD_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "../engagement/engagementStyles";

export type DashboardTopPositionsProps = {
  rows: DashboardPositionRow[];
  isConnected: boolean;
  maxItems?: number;
};

export function DashboardTopPositions({
  rows,
  isConnected,
  maxItems = 3,
}: DashboardTopPositionsProps) {
  if (!isConnected) return null;

  const top = [...rows]
    .filter((r) => r.usd > 0)
    .sort((a, b) => b.usd - a.usd)
    .slice(0, maxItems);

  if (top.length < 2) return null;

  return (
    <section className={DASHBOARD_INTELLIGENCE_CARD_CLASS} aria-label="Top positions">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Top positions</p>
      <ol className="mt-3 space-y-2">
        {top.map((row, index) => (
          <li
            key={row.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate text-white/85">
              <span className="mr-2 tabular-nums text-white/45">{index + 1}.</span>
              {formatMarketLabel(row.marketLabel)}
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-white/95">
              {formatUSD(row.usd, { compact: false })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
