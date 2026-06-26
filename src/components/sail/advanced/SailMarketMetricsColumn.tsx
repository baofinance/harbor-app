"use client";

import type { ReactNode } from "react";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import {
  formatLeverage,
  formatRatio,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import { SailFeeRatioCell } from "@/components/sail/SailFeeRatioCell";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import type { DefinedMarket } from "@/config/markets";
import {
  SAIL_ADVANCED_BODY,
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_PANEL,
} from "./sailAdvancedStyles";

type SailMarketMetricsColumnProps = {
  market: DefinedMarket;
  metrics: SailMarketDetailMetrics | undefined;
};

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0">
      <span className={SAIL_ADVANCED_CAPTION}>{label}</span>
      <span className="text-right text-sm font-mono font-semibold text-white">{value}</span>
    </div>
  );
}

export function SailMarketMetricsColumn({
  market,
  metrics,
}: SailMarketMetricsColumnProps) {
  const pegTarget = metrics?.pegTarget || market.pegTarget || "USD";
  const underlying = metrics?.underlyingToken || "USD";

  return (
    <aside className={`${SAIL_ADVANCED_PANEL} p-3 sm:p-4`}>
      <h2 className={`mb-2 ${SAIL_ADVANCED_LABEL}`}>Market metrics</h2>

      <div className="mb-3">
        <MetricRow label="TVL (USD)" value={metrics?.tvlUSD !== undefined ? formatUSD(metrics.tvlUSD) : "—"} />
        <MetricRow label="TVL" value={metrics?.tvlCollateralDisplay ?? "—"} />
        <MetricRow label="24h Volume" value="—" />
        <MetricRow label="Leverage" value={formatLeverage(metrics?.leverageRatio)} />
        <MetricRow label="Collateral ratio" value={formatRatio(metrics?.collateralRatio)} />
        <MetricRow
          label="Token price"
          value={
            metrics?.tokenPriceUSD !== undefined
              ? formatUSD(metrics.tokenPriceUSD)
              : "—"
          }
        />
        <MetricRow
          label="Mint fee"
          value={
            <SailFeeRatioCell
              ratio={metrics?.mintFeeRatio}
              isMintSail
              activeBand={metrics?.activeMintBand}
            />
          }
        />
        <MetricRow
          label="Redeem fee"
          value={
            <SailFeeRatioCell
              ratio={metrics?.redeemFeeRatio}
              isMintSail={false}
              activeBand={metrics?.activeRedeemBand}
            />
          }
        />
        <MetricRow
          label="Rebalance at"
          value={metrics?.rebalanceThresholdLabel ?? "—"}
        />
        <MetricRow label="Collateral" value={metrics?.collateralSymbol ?? "—"} />
        <MetricRow label="Peg target" value={pegTarget} />
      </div>

      <div className={`rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 ${SAIL_ADVANCED_BODY}`}>
        Composable short {pegTarget} against {underlying} with variable,
        rebalancing leverage and no funding fees.
        {metrics?.rebalanceThresholdLabel ? (
          <> Rebalances at {metrics.rebalanceThresholdLabel}.</>
        ) : null}
      </div>

      <p className={`mt-3 ${SAIL_ADVANCED_CAPTION}`}>
        Short {getShortSide(market)} · Long {getLongSide(market)}
      </p>
    </aside>
  );
}
