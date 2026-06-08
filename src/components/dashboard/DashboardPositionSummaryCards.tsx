"use client";

import type { ReactNode } from "react";
import {
  ChartPieIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import {
  DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_MV_CLASS,
  DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
} from "./dashboardStyles";

function StatIconBadge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`${className} !h-7 !w-7 sm:!h-8 sm:!w-8`} aria-hidden>
      {children}
    </span>
  );
}

export type DashboardPositionSummaryCardsProps = {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
  showArchived: boolean;
  isConnected: boolean;
  /** Render chips only — for embedding in a shared stat strip. */
  bare?: boolean;
};

export function DashboardPositionSummaryCards({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
  bare = false,
}: DashboardPositionSummaryCardsProps) {
  const totalExposure = maidenUsd + earnUsd + sailUsd;
  const dash = "—";

  const chips = (
    <>
      <DashboardMetricChip
        label="Total exposure"
        value={isConnected ? formatUSD(totalExposure, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_MV_CLASS}>
            <ChartPieIcon className="h-4 w-4" />
          </StatIconBadge>
        }
      />
      <DashboardMetricChip
        label="Maiden Voyage"
        value={isConnected ? formatUSD(maidenUsd, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_MV_CLASS}>
            <SparklesIcon className="h-4 w-4" />
          </StatIconBadge>
        }
      />
      <DashboardMetricChip
        label="Earn"
        value={isConnected ? formatUSD(earnUsd, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_EARN_CLASS}>
            <CurrencyDollarIcon className="h-4 w-4" />
          </StatIconBadge>
        }
      />
      <DashboardMetricChip
        label="Sail"
        value={isConnected ? formatUSD(sailUsd, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_SAIL_CLASS}>
            <WalletIcon className="h-4 w-4" />
          </StatIconBadge>
        }
      />
      {showArchived ? (
        <DashboardMetricChip
          label="Archived"
          value={isConnected ? formatUSD(archivedUsd, { compact: false }) : dash}
          inline
          icon={
            <StatIconBadge className={DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS}>
              <SparklesIcon className="h-4 w-4" />
            </StatIconBadge>
          }
        />
      ) : null}
    </>
  );

  if (bare) return chips;

  return (
    <DashboardMetricStrip inline scroll>
      {chips}
    </DashboardMetricStrip>
  );
}
