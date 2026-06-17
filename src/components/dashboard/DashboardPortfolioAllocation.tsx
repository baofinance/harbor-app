"use client";

import { MV_CARD_INNER_GRADIENT, MV_CARD_SHELL, MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import {
  PORTFOLIO_CARD_SHELL_DARK,
  PORTFOLIO_LABEL_CLASS,
  PORTFOLIO_MUTED_CLASS,
} from "./portfolio/portfolioStyles";

export type DashboardPortfolioAllocationProps = {
  slices: PortfolioAllocationSlice[];
  isConnected: boolean;
  compact?: boolean;
};

export function DashboardPortfolioAllocation({
  slices,
  isConnected,
  compact = false,
}: DashboardPortfolioAllocationProps) {
  if (!isConnected || slices.length === 0) return null;

  if (compact) {
    return (
      <section
        className={`${PORTFOLIO_CARD_SHELL_DARK} border-l-[3px] border-l-[#F5D76E]/70 px-3 py-2.5 sm:px-3.5 sm:py-3`}
        aria-label="Portfolio allocation"
      >
        <p className={PORTFOLIO_LABEL_CLASS}>Portfolio allocation</p>
        <div className="mt-2 space-y-1.5">
          {slices.map((slice) => (
            <div key={slice.id}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
                <span className={`font-medium ${slice.accentClass}`}>{slice.label}</span>
                <span className={`tabular-nums ${PORTFOLIO_MUTED_CLASS}`}>
                  {slice.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${slice.barClass}`}
                  style={{ width: `${Math.max(slice.pct, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3.5 sm:px-5 sm:py-4`}
      aria-label="Portfolio allocation"
    >
      <p className={MV_SECTION_LABEL}>Portfolio allocation</p>
      <div className="mt-3 space-y-3">
        {slices.map((slice) => (
          <div key={slice.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className={`font-medium ${slice.accentClass}`}>{slice.label}</span>
              <span className={`tabular-nums ${PORTFOLIO_MUTED_CLASS}`}>
                {slice.pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${slice.barClass}`}
                style={{ width: `${Math.max(slice.pct, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
