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
    <span className={`${className} !h-8 !w-8`} aria-hidden>
      {children}
    </span>
  );
}

export type DashboardSummaryCardsProps = {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
  showArchived: boolean;
  isConnected: boolean;
};

export function DashboardSummaryCards({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
}: DashboardSummaryCardsProps) {
  const totalExposure = maidenUsd + earnUsd + sailUsd;
  const dash = "—";

  return (
    <DashboardMetricStrip inline>
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
            <StatIconBadge className={DASHBOARD_PRODUCT_ICON_MV_CLASS}>
              <SparklesIcon className="h-4 w-4" />
            </StatIconBadge>
          }
        />
      ) : null}
    </DashboardMetricStrip>
  );
}
