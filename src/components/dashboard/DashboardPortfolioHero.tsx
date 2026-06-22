"use client";

import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_HEADLINE,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatPercent, formatUSD } from "@/utils/formatters";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import {
  DASHBOARD_HERO_ALLOCATION_TRACK,
  DASHBOARD_HERO_METRIC_TILE,
  PORTFOLIO_MUTED_CLASS,
} from "./portfolio/portfolioStyles";

const PRODUCT_SLICE_IDS = new Set(["earn", "sail", "archived"]);

export type DashboardPortfolioHeroProps = {
  totalPositionValue: number;
  activePositionCount: number;
  allocationSlices: PortfolioAllocationSlice[];
  revenueShareYieldUsd: number;
  earnYieldUsd: number;
  revenueShareExposurePct: number;
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

function HeroMetricTile({
  label,
  value,
  accentBorderClass,
  valueClass = "text-white/95",
}: {
  label: string;
  value: string;
  accentBorderClass: string;
  valueClass?: string;
}) {
  return (
    <div className={`${DASHBOARD_HERO_METRIC_TILE} border-l-[3px] ${accentBorderClass}`}>
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums sm:text-base ${valueClass}`}>
        {value}
      </p>
    </div>
  );
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
  revenueShareExposurePct,
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
          <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:max-w-md lg:w-auto lg:max-w-lg">
            <HeroMetricTile
              label="Revenue share yield"
              value={formatStatUsd(revenueShareYieldUsd, isConnected, isLoading)}
              accentBorderClass="border-l-[#F5D76E]/70"
              valueClass="text-[#F5D76E]"
            />
            <HeroMetricTile
              label="Earn yield"
              value={formatStatUsd(earnYieldUsd, isConnected, isEarnLoading)}
              accentBorderClass="border-l-[#B8EBD5]/70"
              valueClass="text-[#B8EBD5]"
            />
            <HeroMetricTile
              label="Total earned"
              value={formatStatUsd(
                totalYieldEarned,
                isConnected,
                isLoading || isEarnLoading,
              )}
              accentBorderClass="border-l-white/30"
            />
            <HeroMetricTile
              label="Rev share exp."
              value={
                isLoading
                  ? "…"
                  : formatPercent(revenueShareExposurePct, { decimals: 2 })
              }
              accentBorderClass="border-l-[#F5D76E]/70"
              valueClass="text-[#F5D76E]"
            />
          </div>
        ) : null}
      </div>

      {showAllocation ? <HeroAllocationBand slices={allocationSlices} /> : null}
    </section>
  );
}
