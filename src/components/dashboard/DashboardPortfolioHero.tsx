"use client";

import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import { formatDashboardEarnedUsd } from "./portfolio/dashboardPortfolioUtils";
import { DashboardStatChip } from "./DashboardStatChip";
import {
  DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_MUTED_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS,
} from "./dashboardStyles";
import { DASHBOARD_HERO_BRAND_EDGE_CLASS } from "./dashboardBrand";
import {
  DASHBOARD_HERO_LABEL_CLASS,
  DASHBOARD_HERO_SUPPORTING_CLASS,
  DASHBOARD_NUMERIC_HERO_CLASS,
} from "./dashboardTypography";
import {
  DASHBOARD_HERO_ALLOCATION_TRACK,
  PORTFOLIO_MUTED_CLASS,
} from "./portfolio/portfolioStyles";
import { formatUSD } from "@/utils/formatters";

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
  earned = false,
): string {
  if (!isConnected) return "—";
  if (isLoading) return "…";
  return earned ? formatDashboardEarnedUsd(usd) : formatUSD(usd, { compact: false });
}

function HeroAllocationBand({ slices }: { slices: PortfolioAllocationSlice[] }) {
  const productSlices = slices.filter((s) => PRODUCT_SLICE_IDS.has(s.id));
  if (productSlices.length === 0) return null;

  return (
    <div className="mt-4 border-t border-white/[0.08] pt-4">
      <p className={MV_SECTION_LABEL}>Portfolio allocation</p>
      <div className={`mt-2 flex gap-px ${DASHBOARD_HERO_ALLOCATION_TRACK}`}>
        {productSlices.map((slice, index) => {
          const isFirst = index === 0;
          const isLast = index === productSlices.length - 1;
          return (
            <div
              key={slice.id}
              className={`h-full transition-[width] duration-500 ${slice.barClass} ${
                isFirst ? "rounded-l-full" : ""
              } ${isLast ? "rounded-r-full" : ""}`}
              style={{ width: `${Math.max(slice.pct, 0)}%` }}
              title={`${slice.label} ${slice.pct.toFixed(0)}%`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-y-2">
        {productSlices.map((slice) => (
          <div key={slice.id} className="flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${slice.dotClass}`}
              aria-hidden
            />
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
      className={`relative ${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} ${DASHBOARD_HERO_BRAND_EDGE_CLASS} px-4 py-3.5 sm:px-5 sm:py-4`}
      aria-label="Portfolio value"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 shrink-0">
          <p className={DASHBOARD_HERO_LABEL_CLASS}>Portfolio value</p>
          <p
            className={`${DASHBOARD_NUMERIC_HERO_CLASS} mt-1 [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]`}
          >
            {valueDisplay}
          </p>
          {isConnected && !isLoading ? (
            <>
              <p className={`mt-2 ${DASHBOARD_HERO_SUPPORTING_CLASS}`}>{positionLabel}</p>
              {revenueShareYieldUsd > 0 || earnYieldUsd > 0 ? (
                <p className={`mt-1 ${PORTFOLIO_MUTED_CLASS}`}>
                  Founding revenue + earn yield
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {showMetrics ? (
          <div className="flex w-full min-w-0 flex-nowrap items-stretch justify-end gap-2 overflow-x-auto lg:w-auto lg:shrink-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DashboardStatChip
              label="Revenue share yield"
              value={formatStatUsd(revenueShareYieldUsd, isConnected, isLoading, true)}
              context="All time"
              borderClass={DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS}
              emphasis="primary"
              valueClass={
                revenueShareYieldUsd > 0 ? "font-mono text-sm font-semibold tabular-nums text-[#F5D76E]" : undefined
              }
            />
            <DashboardStatChip
              label="Earn yield"
              value={formatStatUsd(earnYieldUsd, isConnected, isEarnLoading, true)}
              context="All time"
              borderClass={DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS}
              emphasis="tertiary"
            />
            <DashboardStatChip
              label="Total earned"
              value={formatStatUsd(
                totalYieldEarned,
                isConnected,
                isLoading || isEarnLoading,
                true,
              )}
              context="Combined"
              borderClass={DASHBOARD_STAT_CHIP_BORDER_MUTED_CLASS}
              emphasis="secondary"
            />
          </div>
        ) : null}
      </div>

      {showAllocation ? <HeroAllocationBand slices={allocationSlices} /> : null}
    </section>
  );
}
