"use client";

import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_HEADLINE,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import { DashboardStatChip } from "./DashboardStatChip";
import {
  DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_MUTED_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS,
} from "./dashboardStyles";
import {
  DASHBOARD_HERO_ALLOCATION_TRACK,
  PORTFOLIO_MUTED_CLASS,
} from "./portfolio/portfolioStyles";

const PRODUCT_SLICE_IDS = new Set(["earn", "sail", "archived"]);

export type DashboardPortfolioHeroProps = {
  totalPositionValue: number;
  activePositionCount: number;
  allocationSlices: PortfolioAllocationSlice[];
  revenueShareYieldUsd: number;
  earnYieldUsd: number;
  isConnected: boolean;
  isLoading?: boolean;
  isEarnLoading?: boolean;
};

function formatStatUsd(
  usd: number,
  isConnected: boolean,
  isLoading: boolean,
): string {
  if (!isConnected) return "—";
  if (isLoading) return "…";
  return formatUSD(usd, { compact: false });
}

function HeroAllocationBand({ slices }: { slices: PortfolioAllocationSlice[] }) {
  const productSlices = slices.filter((s) => PRODUCT_SLICE_IDS.has(s.id));
  if (productSlices.length === 0) return null;

  return (
    <div className="mt-4 border-t border-white/[0.08] pt-4">
      <p className={MV_SECTION_LABEL}>Portfolio allocation</p>
      <div className={`mt-2 flex ${DASHBOARD_HERO_ALLOCATION_TRACK}`}>
        {productSlices.map((slice) => (
          <div
            key={slice.id}
            className={`h-full transition-[width] duration-500 ${slice.barClass}`}
            style={{ width: `${Math.max(slice.pct, 0)}%` }}
            title={`${slice.label} ${slice.pct.toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {productSlices.map((slice) => (
          <div key={slice.id} className="flex items-baseline gap-1.5 text-xs">
            <span className={`font-medium ${slice.accentClass}`}>{slice.label}</span>
            <span className="tabular-nums text-white/80">{slice.pct.toFixed(0)}%</span>
            <span className={`tabular-nums ${PORTFOLIO_MUTED_CLASS}`}>
              · {formatUSD(slice.usd, { compact: false })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPortfolioHero({
  totalPositionValue,
  activePositionCount,
  allocationSlices,
  revenueShareYieldUsd,
  earnYieldUsd,
  isConnected,
  isLoading = false,
  isEarnLoading = false,
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

  const totalYieldEarned = revenueShareYieldUsd + earnYieldUsd;
  const showMetrics = isConnected && !isLoading;
  const showAllocation = showMetrics;

  return (
    <section
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-4 sm:px-5 sm:py-5`}
      aria-label="Portfolio value"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

        {showMetrics ? (
          <div className="flex w-full min-w-0 flex-nowrap items-stretch justify-end gap-2 overflow-x-auto lg:w-auto lg:shrink-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DashboardStatChip
              label="Revenue share yield"
              value={formatStatUsd(revenueShareYieldUsd, isConnected, isLoading)}
              borderClass={DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS}
            />
            <DashboardStatChip
              label="Earn yield"
              value={formatStatUsd(earnYieldUsd, isConnected, isEarnLoading)}
              borderClass={DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS}
            />
            <DashboardStatChip
              label="Total earned"
              value={formatStatUsd(
                totalYieldEarned,
                isConnected,
                isLoading || isEarnLoading,
              )}
              borderClass={DASHBOARD_STAT_CHIP_BORDER_MUTED_CLASS}
            />
          </div>
        ) : null}
      </div>

      {showAllocation ? <HeroAllocationBand slices={allocationSlices} /> : null}
    </section>
  );
}
