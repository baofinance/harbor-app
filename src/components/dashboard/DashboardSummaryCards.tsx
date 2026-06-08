"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ChartBarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { formatUSD } from "@/utils/formatters";
import { DashboardMetricChip } from "./DashboardMetricChip";
import { DashboardMetricStrip } from "./DashboardSummaryStrip";
import {
  DASHBOARD_LINK_CLASS,
  DASHBOARD_METRIC_CHIP_VALUE_CLASS,
  DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_MV_CLASS,
  DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
  DASHBOARD_PRODUCT_ICON_YIELD_CLASS,
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
  totalEarned: number;
  totalOutstanding: number;
};

export function DashboardSummaryCards({
  maidenUsd,
  earnUsd,
  sailUsd,
  archivedUsd,
  showArchived,
  isConnected,
  totalEarned,
  totalOutstanding,
}: DashboardSummaryCardsProps) {
  const totalExposure = maidenUsd + earnUsd + sailUsd;
  const dash = "—";

  return (
    <DashboardMetricStrip inline scroll>
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
      <DashboardMetricChip
        label="Total earned"
        value={isConnected ? formatUSD(totalEarned, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_EARN_CLASS}>
            <ChartBarIcon className="h-4 w-4" />
          </StatIconBadge>
        }
        valueClassName={
          isConnected && totalEarned > 0
            ? "text-[#B8EBD5]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
      />
      <DashboardMetricChip
        label="Uncollected"
        value={isConnected ? formatUSD(totalOutstanding, { compact: false }) : dash}
        inline
        icon={
          <StatIconBadge className={DASHBOARD_PRODUCT_ICON_YIELD_CLASS}>
            <ChartBarIcon className="h-4 w-4" />
          </StatIconBadge>
        }
        valueClassName={
          isConnected && totalOutstanding > 0
            ? "text-[#FF8A7A]"
            : DASHBOARD_METRIC_CHIP_VALUE_CLASS
        }
        action={
          isConnected && totalOutstanding > 0 ? (
            <Link href="/genesis" className={`text-xs ${DASHBOARD_LINK_CLASS}`}>
              View genesis
            </Link>
          ) : undefined
        }
      />
    </DashboardMetricStrip>
  );
}
