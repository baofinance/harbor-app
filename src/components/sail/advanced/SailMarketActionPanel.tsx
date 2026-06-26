"use client";

import type { ReactNode } from "react";
import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import { formatUSD } from "@/utils/sailDisplayFormat";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_PANEL,
  SAIL_EMBEDDED_FORM_PANEL,
} from "./sailAdvancedStyles";

export type SailMarketActionPanelProps = {
  marketId: string;
  market: DefinedMarket;
  userDeposit?: bigint;
  currentValueUSD?: number;
  initialTab?: "mint" | "redeem";
  onSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
};

function PositionValue({ value }: { value: ReactNode }) {
  return (
    <div className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2">
      <div className={SAIL_ADVANCED_CAPTION}>Value</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

/** Embedded Mint | Redeem panel — wraps `SailManageModal` in inline mode. */
export function SailMarketActionPanel({
  marketId,
  market,
  userDeposit,
  currentValueUSD,
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
        <PositionValue value={formatUSD(currentValueUSD ?? 0)} />
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
