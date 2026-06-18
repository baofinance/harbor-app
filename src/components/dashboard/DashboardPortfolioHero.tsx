"use client";

import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_HEADLINE,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import { PORTFOLIO_MUTED_CLASS } from "./portfolio/portfolioStyles";

const PRODUCT_SLICE_IDS = new Set(["earn", "sail", "archived"]);

export type DashboardPortfolioHeroProps = {
  totalPositionValue: number;
  activePositionCount: number;
  allocationSlices: PortfolioAllocationSlice[];
  isConnected: boolean;
  isLoading?: boolean;
};

function InlineAllocation({ slices }: { slices: PortfolioAllocationSlice[] }) {
  const productSlices = slices.filter((s) => PRODUCT_SLICE_IDS.has(s.id));
  if (productSlices.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-4 gap-y-2 sm:justify-end">
      {productSlices.map((slice) => (
        <div key={slice.id} className="min-w-[4.5rem] flex-1 sm:max-w-[7rem]">
          <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
            <span className={`truncate font-medium ${slice.accentClass}`}>{slice.label}</span>
            <span className={`shrink-0 tabular-nums ${PORTFOLIO_MUTED_CLASS}`}>
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
  );
}

export function DashboardPortfolioHero({
  totalPositionValue,
  activePositionCount,
  allocationSlices,
  isConnected,
  isLoading = false,
}: DashboardPortfolioHeroProps) {
  const valueDisplay = !isConnected
    ? "—"
    : isLoading
      ? "…"
      : formatUSD(totalPositionValue, { compact: false });

  const positionLabel =
    activePositionCount === 1
      ? "1 active position"
      : `${activePositionCount} active positions`;

  const showAllocation = isConnected && !isLoading;

  return (
    <section
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-4 sm:px-5 sm:py-5`}
      aria-label="Portfolio value"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 shrink-0">
          <p className={MV_SECTION_LABEL}>Portfolio value</p>
          <p
            className={`${MV_HEADLINE} mt-1 text-3xl font-bold tabular-nums text-white sm:text-4xl lg:text-5xl`}
          >
            {valueDisplay}
          </p>
          {isConnected && !isLoading ? (
            <p className="mt-2 text-sm text-white/60">{positionLabel}</p>
          ) : null}
        </div>
        {showAllocation ? <InlineAllocation slices={allocationSlices} /> : null}
      </div>
    </section>
  );
}
