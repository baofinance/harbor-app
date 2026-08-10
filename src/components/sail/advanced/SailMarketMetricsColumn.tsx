"use client";

import type { ReactNode } from "react";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import {
  formatLeverage,
  formatRatio,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import type { DefinedMarket } from "@/config/markets";
import { getSailMarketTokenSymbol } from "@/utils/sailMarketDirectionLabels";
import {
  SAIL_ADVANCED_GLASS_CAPTION,
  SAIL_ADVANCED_GLASS_CARD,
  SAIL_ADVANCED_GLASS_SECTION_TITLE,
  SAIL_ADVANCED_GLASS_VALUE,
} from "./sailAdvancedStyles";

type SailMarketMetricsPanelProps = {
  market: DefinedMarket;
  metrics: SailMarketDetailMetrics | undefined;
};

function isEmptyMetric(value: ReactNode): boolean {
  return value === "—" || value === "-" || value == null || value === "";
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  if (isEmptyMetric(value)) return null;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] py-2 last:border-b-0">
      <span className={SAIL_ADVANCED_GLASS_CAPTION}>{label}</span>
      <span className={`text-right ${SAIL_ADVANCED_GLASS_VALUE}`}>{value}</span>
    </div>
  );
}

function MetricSectionCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  const visibleRows = rows.filter((row) => !isEmptyMetric(row.value));
  if (visibleRows.length === 0) return null;

  return (
    <div className={`${SAIL_ADVANCED_GLASS_CARD} p-3`}>
      <h3 className={`mb-2 ${SAIL_ADVANCED_GLASS_SECTION_TITLE}`}>
        {title}
      </h3>
      <div>
        {visibleRows.map((row) => (
          <MetricRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

export function SailMarketMetricsPanel({
  market,
  metrics,
}: SailMarketMetricsPanelProps) {
  const pegTarget = metrics?.pegTarget || market.pegTarget || "USD";
  const tokenSymbol = getSailMarketTokenSymbol(market);
  const tvlUsd =
    metrics?.tvlUSD !== undefined ? formatUSD(metrics.tvlUSD) : undefined;
  const tokenPrice =
    metrics?.tokenPriceUSD !== undefined
      ? formatUSD(metrics.tokenPriceUSD)
      : undefined;
  const leverage = formatLeverage(metrics?.leverageRatio);
  const collateralRatio = formatRatio(metrics?.collateralRatio);
  const rebalanceAt = metrics?.rebalanceThresholdLabel;
  const collateral = metrics?.collateralSymbol;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <MetricSectionCard
        title="Market"
        rows={[
          { label: "Sail token", value: tokenSymbol },
          { label: "TVL (USD)", value: tvlUsd },
          { label: "TVL", value: metrics?.tvlCollateralDisplay },
          { label: "Token price", value: tokenPrice },
          { label: "Collateral", value: collateral },
          { label: "Peg target", value: pegTarget },
        ]}
      />

      <MetricSectionCard
        title="Risk"
        rows={[
          { label: "Current leverage", value: leverage },
          { label: "Collateral ratio", value: collateralRatio },
          { label: "Rebalance at", value: rebalanceAt },
        ]}
      />
    </div>
  );
}

/** @deprecated Use SailMarketMetricsCollapsible on UI+ layout. */
export function SailMarketMetricsColumn({
  market,
  metrics,
}: SailMarketMetricsPanelProps) {
  return <SailMarketMetricsPanel market={market} metrics={metrics} />;
}
