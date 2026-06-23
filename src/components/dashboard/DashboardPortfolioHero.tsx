"use client";

import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import { formatDashboardEarnedUsd } from "./portfolio/dashboardPortfolioUtils";
import { DashboardHeroStatColumn } from "./DashboardHeroStatColumn";
import { DASHBOARD_HERO_BRAND_EDGE_CLASS } from "./dashboardBrand";
import {
  DASHBOARD_HERO_COLUMN_CLASS,
  DASHBOARD_HERO_GRID_CLASS,
  DASHBOARD_HERO_STATS_ROW_CLASS,
  DASHBOARD_HERO_STAT_LABEL_CLASS,
  DASHBOARD_HERO_YIELD_COLUMN_CLASS,
} from "./dashboardStyles";
import {
  DASHBOARD_HERO_SUPPORTING_CLASS,
  DASHBOARD_NUMERIC_HERO_CLASS,
} from "./dashboardTypography";
import {
  DASHBOARD_HERO_ALLOCATION_TRACK,
  PORTFOLIO_MUTED_CLASS,
} from "./portfolio/portfolioStyles";
import { formatUSD } from "@/utils/formatters";

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

function HeroAllocationColumn({ slices }: { slices: PortfolioAllocationSlice[] }) {
  if (slices.length === 0) {
    return (
      <div className={DASHBOARD_HERO_COLUMN_CLASS}>
        <p className={DASHBOARD_HERO_STAT_LABEL_CLASS}>Portfolio allocation</p>
        <p className={`mt-2 ${PORTFOLIO_MUTED_CLASS}`}>—</p>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_HERO_COLUMN_CLASS}>
      <p className={DASHBOARD_HERO_STAT_LABEL_CLASS}>Portfolio allocation</p>
      <div className={`mt-2 flex gap-px ${DASHBOARD_HERO_ALLOCATION_TRACK}`}>
        {slices.map((slice, index) => {
          const isFirst = index === 0;
          const isLast = index === slices.length - 1;
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
      <div className="mt-2 flex flex-col gap-y-1">
        {slices.map((slice) => (
          <div key={slice.id} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${slice.dotClass}`}
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

function HeroYieldStats({
  revenueShareYieldUsd,
  earnYieldUsd,
  isConnected,
  isLoading,
  isEarnLoading,
}: {
  revenueShareYieldUsd: number;
  earnYieldUsd: number;
  isConnected: boolean;
  isLoading: boolean;
  isEarnLoading: boolean;
}) {
  const totalYieldEarned = revenueShareYieldUsd + earnYieldUsd;

  return (
    <div className={DASHBOARD_HERO_STATS_ROW_CLASS}>
      <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
        <DashboardHeroStatColumn
          label="Revenue share yield"
          context="All time"
          value={formatStatUsd(revenueShareYieldUsd, isConnected, isLoading, true)}
          valueClassName={revenueShareYieldUsd > 0 ? "text-[#F5D76E]" : "text-white/80"}
        />
      </div>
      <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
        <DashboardHeroStatColumn
          label="Earn yield"
          context="All time"
          value={formatStatUsd(earnYieldUsd, isConnected, isEarnLoading, true)}
          valueClassName={earnYieldUsd > 0 ? "text-[#B8EBD5]" : "text-white/80"}
        />
      </div>
      <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
        <DashboardHeroStatColumn
          label="Total earned"
          context="Combined"
          value={formatStatUsd(
            totalYieldEarned,
            isConnected,
            isLoading || isEarnLoading,
            true,
          )}
        />
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
    activePositionCount === 1 ? "1 position" : `${activePositionCount} positions`;

  const showYieldStats = isConnected && !isLoading;

  return (
    <section
      className={`relative ${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} ${DASHBOARD_HERO_BRAND_EDGE_CLASS} px-4 py-3.5 sm:px-5 sm:py-4`}
      aria-label="Portfolio value"
    >
      <div className={DASHBOARD_HERO_GRID_CLASS}>
        <div className={DASHBOARD_HERO_COLUMN_CLASS}>
          <p className={DASHBOARD_HERO_STAT_LABEL_CLASS}>Portfolio value</p>
          <p
            className={`${DASHBOARD_NUMERIC_HERO_CLASS} mt-1 [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]`}
          >
            {valueDisplay}
          </p>
          {isConnected && !isLoading ? (
            <p className={`mt-2 ${DASHBOARD_HERO_SUPPORTING_CLASS}`}>{positionLabel}</p>
          ) : null}
        </div>

        {showYieldStats ? (
          <HeroAllocationColumn slices={allocationSlices} />
        ) : (
          <div className={DASHBOARD_HERO_COLUMN_CLASS}>
            <p className={DASHBOARD_HERO_STAT_LABEL_CLASS}>Portfolio allocation</p>
            <p className={`mt-2 ${PORTFOLIO_MUTED_CLASS}`}>—</p>
          </div>
        )}

        {showYieldStats ? (
          <HeroYieldStats
            revenueShareYieldUsd={revenueShareYieldUsd}
            earnYieldUsd={earnYieldUsd}
            isConnected={isConnected}
            isLoading={isLoading}
            isEarnLoading={isEarnLoading}
          />
        ) : (
          <div className={DASHBOARD_HERO_STATS_ROW_CLASS}>
            <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
              <DashboardHeroStatColumn label="Revenue share yield" value="—" />
            </div>
            <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
              <DashboardHeroStatColumn label="Earn yield" value="—" />
            </div>
            <div className={DASHBOARD_HERO_YIELD_COLUMN_CLASS}>
              <DashboardHeroStatColumn label="Total earned" value="—" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
