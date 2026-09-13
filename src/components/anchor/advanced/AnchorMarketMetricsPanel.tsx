"use client";

import type { ReactNode } from "react";
import type { DefinedMarket } from "@/config/markets";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import { formatAPR, formatCompactUSD } from "@/utils/anchor";
import { formatUSD } from "@/utils/formatters";
import {
  ANCHOR_ADVANCED_GLASS_CAPTION,
  ANCHOR_ADVANCED_GLASS_CARD,
  ANCHOR_ADVANCED_GLASS_SECTION_TITLE,
  ANCHOR_ADVANCED_GLASS_VALUE,
} from "./anchorAdvancedStyles";

type AnchorMarketMetricsPanelProps = {
  market: DefinedMarket;
  marketData: MarketData | undefined;
  peggedPriceUSD?: number;
};

function isEmptyMetric(value: ReactNode): boolean {
  return value === "—" || value === "-" || value == null || value === "";
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  if (isEmptyMetric(value)) return null;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] py-2 last:border-b-0">
      <span className={ANCHOR_ADVANCED_GLASS_CAPTION}>{label}</span>
      <span className={`text-right ${ANCHOR_ADVANCED_GLASS_VALUE}`}>{value}</span>
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
    <div className={`${ANCHOR_ADVANCED_GLASS_CARD} p-3`}>
      <h3 className={`mb-2 ${ANCHOR_ADVANCED_GLASS_SECTION_TITLE}`}>{title}</h3>
      <div>
        {visibleRows.map((row) => (
          <MetricRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function poolTvlUsd(
  tvl: bigint | undefined,
  peggedPriceUSD: number | undefined,
): string | undefined {
  if (!tvl || !peggedPriceUSD || peggedPriceUSD <= 0) return undefined;
  return formatCompactUSD((Number(tvl) / 1e18) * peggedPriceUSD);
}

function poolAprLabel(
  apr: { collateral: number; steam: number } | undefined,
): string | undefined {
  if (!apr) return undefined;
  const total = (apr.collateral || 0) + (apr.steam || 0);
  if (total <= 0) return undefined;
  return formatAPR(total);
}

export function AnchorMarketMetricsPanel({
  market,
  marketData,
  peggedPriceUSD,
}: AnchorMarketMetricsPanelProps) {
  const haSymbol = market.peggedToken?.symbol || "haToken";
  const collateral = market.collateral?.symbol;
  const pegTarget = market.pegTarget || "USD";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <MetricSectionCard
        title="Market"
        rows={[
          { label: "haToken", value: haSymbol },
          { label: "Collateral", value: collateral },
          { label: "Peg target", value: pegTarget },
          {
            label: "haToken price",
            value:
              peggedPriceUSD !== undefined && peggedPriceUSD > 0
                ? formatUSD(peggedPriceUSD)
                : undefined,
          },
        ]}
      />

      <MetricSectionCard
        title="Stability pools"
        rows={[
          {
            label: "Collateral pool TVL",
            value: poolTvlUsd(marketData?.collateralPoolTVL, peggedPriceUSD),
          },
          {
            label: "Collateral pool APR",
            value: poolAprLabel(marketData?.collateralPoolAPR),
          },
          {
            label: "Sail pool TVL",
            value: poolTvlUsd(marketData?.sailPoolTVL, peggedPriceUSD),
          },
          {
            label: "Sail pool APR",
            value: poolAprLabel(marketData?.sailPoolAPR),
          },
        ]}
      />
    </div>
  );
}
