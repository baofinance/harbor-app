"use client";

import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import {
  SAIL_ADVANCED_PANEL,
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
    <aside className={`${SAIL_ADVANCED_PANEL} flex flex-col p-3 sm:p-4`}>
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
