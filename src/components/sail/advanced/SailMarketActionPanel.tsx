"use client";

import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import {
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_META,
  SAIL_EMBEDDED_FORM_PANEL,
} from "./sailAdvancedStyles";

export type SailMarketActionPanelProps = {
  marketId: string;
  market: DefinedMarket;
  initialTab?: "mint" | "redeem";
  onSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
};

/** Embedded Mint | Redeem panel — wraps `SailManageModal` in inline mode. */
export function SailMarketActionPanel({
  marketId,
  market,
  initialTab = "mint",
  onSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
}: SailMarketActionPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="mb-3 shrink-0">
        <h2 className={SAIL_ADVANCED_LABEL}>Trade</h2>
        <p className={`mt-0.5 ${SAIL_ADVANCED_META}`}>
          Mint or redeem in this market
        </p>
      </div>
      <div className={`${SAIL_EMBEDDED_FORM_PANEL} flex min-h-0 flex-1 flex-col`}>
        <div className="flex min-h-0 flex-1 flex-col">
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
      </div>
    </aside>
  );
}
