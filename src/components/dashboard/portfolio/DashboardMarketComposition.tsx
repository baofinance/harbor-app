"use client";

import type { MarketCompositionSlice } from "./dashboardPortfolioUtils";
import { formatUSD } from "@/utils/formatters";
import { MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { DASHBOARD_HERO_ALLOCATION_TRACK } from "./portfolioStyles";
import { DASHBOARD_INTELLIGENCE_CARD_CLASS, ENGAGEMENT_SECTION_TITLE_CLASS } from "../engagement/engagementStyles";
import { PORTFOLIO_MUTED_CLASS } from "./portfolioStyles";

export type DashboardMarketCompositionProps = {
  slices: MarketCompositionSlice[];
  isConnected: boolean;
};

export function DashboardMarketComposition({
  slices,
  isConnected,
}: DashboardMarketCompositionProps) {
  if (!isConnected || slices.length < 2) return null;

  return (
    <section className={DASHBOARD_INTELLIGENCE_CARD_CLASS} aria-label="Largest markets">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Largest markets</p>
      <div className={`mt-3 flex ${DASHBOARD_HERO_ALLOCATION_TRACK}`}>
        {slices.map((slice) => (
          <div
            key={slice.id}
            className={`h-full transition-[width] duration-500 ${slice.barClass}`}
            style={{ width: `${Math.max(slice.pct, 0)}%` }}
            title={`${slice.label} ${slice.pct.toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {slices.map((slice) => (
          <div key={slice.id} className="flex items-baseline gap-1.5 text-xs">
            <span className={`font-medium ${slice.accentClass}`}>{slice.label}</span>
            <span className="tabular-nums text-white/80">{slice.pct.toFixed(0)}%</span>
            <span className={`tabular-nums ${PORTFOLIO_MUTED_CLASS}`}>
              · {formatUSD(slice.usd, { compact: false })}
            </span>
          </div>
        ))}
      </div>
      <p className={`mt-2 ${MV_SECTION_LABEL}`}>By peg exposure across positions</p>
    </section>
  );
}
