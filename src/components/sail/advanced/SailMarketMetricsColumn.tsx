"use client";

import type { ReactNode } from "react";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import {
  formatLeverage,
  formatRatio,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import { SailFeeRatioCell } from "@/components/sail/SailFeeRatioCell";
import type { DefinedMarket } from "@/config/markets";
import { getSailMarketTokenSymbol } from "@/utils/sailMarketDirectionLabels";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_FROSTED_CARD,
  SAIL_ADVANCED_SECTION_LABEL,
} from "./sailAdvancedStyles";

type SailMarketMetricsColumnProps = {
  market: DefinedMarket;
  metrics: SailMarketDetailMetrics | undefined;
};

function isEmptyMetric(value: ReactNode): boolean {
  return value === "—" || value === "-" || value == null || value === "";
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  if (isEmptyMetric(value)) return null;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0">
      <span className={SAIL_ADVANCED_CAPTION}>{label}</span>
      <span className="text-right text-sm font-mono font-semibold text-white">{value}</span>
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
    <div className={`${SAIL_ADVANCED_FROSTED_CARD} p-3 sm:p-3.5`}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
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

export function SailMarketMetricsColumn({
  market,
  metrics,
}: SailMarketMetricsColumnProps) {
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
    <aside className="flex flex-col gap-3">
      <p className={SAIL_ADVANCED_SECTION_LABEL}>Market metrics</p>

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
          { label: "Leverage", value: leverage },
          { label: "Collateral ratio", value: collateralRatio },
          { label: "Rebalance at", value: rebalanceAt },
        ]}
      />

      <MetricSectionCard
        title="Fees"
        rows={[
          {
            label: "Mint fee",
            value: (
              <SailFeeRatioCell
                ratio={metrics?.mintFeeRatio}
                isMintSail
                activeBand={metrics?.activeMintBand}
              />
            ),
          },
          {
            label: "Redeem fee",
            value: (
              <SailFeeRatioCell
                ratio={metrics?.redeemFeeRatio}
                isMintSail={false}
                activeBand={metrics?.activeRedeemBand}
              />
            ),
          },
        ]}
      />
    </aside>
  );
}
