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

export type DashboardPortfolioHeroProps = {
  totalPositionValue: number;
  totalEarned: number;
  activePositionCount: number;
  allocationSlices: PortfolioAllocationSlice[];
  isConnected: boolean;
  isLoading?: boolean;
};

function InlineAllocation({ slices }: { slices: PortfolioAllocationSlice[] }) {
  if (slices.length === 0) return null;

  return (
    <div className="mt-4 border-t border-white/[0.08] pt-4">
      <p className={MV_SECTION_LABEL}>Allocation</p>
      <div className="mt-2.5 space-y-2">
        {slices.map((slice) => (
          <div key={slice.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
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
    </div>
  );
}

export function DashboardPortfolioHero({
  totalPositionValue,
  totalEarned,
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

  const earnedDisplay = !isConnected
    ? "—"
    : isLoading
      ? "…"
      : formatUSD(totalEarned, { compact: false });

  const positionLabel =
    activePositionCount === 1
      ? "1 active position"
      : `${activePositionCount} active positions`;

  return (
    <section
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-4 sm:px-5 sm:py-5`}
      aria-label="Portfolio value"
    >
      <p className={MV_SECTION_LABEL}>Portfolio value</p>
      <p
        className={`${MV_HEADLINE} mt-1 text-3xl font-bold tabular-nums text-white sm:text-4xl lg:text-5xl`}
      >
        {valueDisplay}
      </p>
      {isConnected ? (
        <p className={`mt-2 text-sm text-white/75 sm:text-base`}>
          {isLoading ? (
            "…"
          ) : (
            <>
              <span className="font-mono font-semibold text-[#F5D76E]">
                {totalEarned > 0 ? "+" : ""}
                {earnedDisplay}
              </span>{" "}
              earned · {positionLabel}
            </>
          )}
        </p>
      ) : null}
      {isConnected && !isLoading ? (
        <InlineAllocation slices={allocationSlices} />
      ) : null}
    </section>
  );
}
