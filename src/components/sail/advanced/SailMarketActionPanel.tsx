"use client";

import type { ReactNode } from "react";
import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import {
  formatLeverage,
  formatRatio,
  formatUSD,
} from "@/utils/sailDisplayFormat";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_PANEL,
  SAIL_EMBEDDED_FORM_PANEL,
} from "./sailAdvancedStyles";

export type SailMarketActionPanelProps = {
  marketId: string;
  market: DefinedMarket;
  metrics: SailMarketDetailMetrics | undefined;
  userDeposit?: bigint;
  currentValueUSD?: number;
  sailMarksForMarket?: number;
  initialTab?: "mint" | "redeem";
  onSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
};

function PositionStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1.5 text-center">
      <div className={SAIL_ADVANCED_CAPTION}>{label}</div>
      <div className="mt-0.5 text-xs font-mono font-semibold text-white">{value}</div>
    </div>
  );
}

/** Embedded Mint | Redeem panel — wraps `SailManageModal` in inline mode. */
export function SailMarketActionPanel({
  marketId,
  market,
  metrics,
  userDeposit,
  currentValueUSD,
  sailMarksForMarket,
  initialTab = "mint",
  onSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
}: SailMarketActionPanelProps) {
  const hasPosition = userDeposit !== undefined && userDeposit > 0n;

  return (
    <aside className={`${SAIL_ADVANCED_PANEL} flex flex-col p-3 sm:p-4`}>
      <h2 className={`mb-2 ${SAIL_ADVANCED_LABEL}`}>Your position</h2>

      {!hasPosition ? (
        <p className={`mb-3 ${SAIL_ADVANCED_CAPTION}`}>
          No open position in this market. Mint below to get started.
        </p>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <PositionStat
            label="Value"
            value={formatUSD(currentValueUSD ?? 0)}
          />
          <PositionStat
            label="Collateral ratio"
            value={formatRatio(metrics?.collateralRatio)}
          />
          <PositionStat
            label="Est. leverage"
            value={formatLeverage(metrics?.leverageRatio)}
          />
          <PositionStat
            label="Rebalance at"
            value={metrics?.rebalanceThresholdLabel ?? "—"}
          />
          {sailMarksForMarket !== undefined ? (
            <div className="col-span-2">
              <PositionStat
                label="Sail marks (est.)"
                value={sailMarksForMarket.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              />
            </div>
          ) : null}
        </div>
      )}

      <div className={SAIL_EMBEDDED_FORM_PANEL}>
        <SailManageModal
          embedded
          isOpen
          onClose={() => {}}
          marketId={marketId}
          market={market}
          initialTab={initialTab}
          onSuccess={onSuccess}
          leveragedTokenPriceUSD={leveragedTokenPriceUSD}
          ethPrice={ethPrice}
          wstETHPrice={wstETHPrice}
          fxSAVEPrice={fxSAVEPrice}
        />
      </div>
    </aside>
  );
}
