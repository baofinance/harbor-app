"use client";

import {
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import type { PortfolioAllocationSlice } from "./portfolio/dashboardPortfolioUtils";
import { PortfolioMetricCard } from "./portfolio/PortfolioMetricCard";
import { DashboardPortfolioAllocation } from "./DashboardPortfolioAllocation";

const ICON_BASE =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-[#0a1929]/55";

const ICON_EARN = `${ICON_BASE} border-harbor-mint/35 text-harbor-mint`;
const ICON_SAIL = `${ICON_BASE} border-harbor-purple/35 text-harbor-purple`;
const ICON_ARCHIVED = `${ICON_BASE} border-white/15 text-white/50`;

const ACCENT_EARN = "border-l-[3px] border-l-harbor-mint/70";
const ACCENT_SAIL = "border-l-[3px] border-l-harbor-purple/70";
const ACCENT_ARCHIVED = "border-l-[3px] border-l-white/25";

export type DashboardCategorySummaryCardsProps = {
  earnUsd: number;
  earnCount: number;
  sailUsd: number;
  sailCount: number;
  archivedUsd: number;
  archivedCount: number;
  allocationSlices?: PortfolioAllocationSlice[];
  isConnected: boolean;
};

export function DashboardCategorySummaryCards({
  earnUsd,
  earnCount,
  sailUsd,
  sailCount,
  archivedUsd,
  archivedCount,
  allocationSlices = [],
  isConnected,
}: DashboardCategorySummaryCardsProps) {
  return (
    <div
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3"
      aria-label="Position categories"
    >
      <PortfolioMetricCard
        title="Earn"
        valueUsd={earnUsd}
        positionCount={earnCount}
        icon={CurrencyDollarIcon}
        iconClass={ICON_EARN}
        accentClass={ACCENT_EARN}
        isConnected={isConnected}
      />
      <PortfolioMetricCard
        title="Sail"
        valueUsd={sailUsd}
        positionCount={sailCount}
        icon={WalletIcon}
        iconClass={ICON_SAIL}
        accentClass={ACCENT_SAIL}
        isConnected={isConnected}
      />
      <PortfolioMetricCard
        title="Archived"
        valueUsd={archivedUsd}
        positionCount={archivedCount}
        icon={ArchiveBoxIcon}
        iconClass={ICON_ARCHIVED}
        accentClass={ACCENT_ARCHIVED}
        isConnected={isConnected}
      />
      <DashboardPortfolioAllocation
        slices={allocationSlices}
        isConnected={isConnected}
        compact
      />
    </div>
  );
}
