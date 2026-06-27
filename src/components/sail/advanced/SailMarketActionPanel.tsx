"use client";

import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import type { SailTradeMarketFees } from "@/components/sail/SailTradeFeeFooter";
import {
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
  marketFees?: SailTradeMarketFees;
};

/** Embedded Buy | Sell panel — wraps `SailManageModal` in inline mode. */
export function SailMarketActionPanel({
  marketId,
  market,
  initialTab = "mint",
  onSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
  marketFees,
}: SailMarketActionPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col">
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
          marketFees={marketFees}
        />
        </div>
      </div>
    </aside>
  );
}
