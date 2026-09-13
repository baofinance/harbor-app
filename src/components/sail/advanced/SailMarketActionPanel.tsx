"use client";

import { SailManageModal } from "@/components/SailManageModal";
import type { DefinedMarket } from "@/config/markets";
import type { SailTradeMarketFees } from "@/components/sail/SailTradeFeeFooter";
import {
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_EMBEDDED_FORM_PANEL,
  SAIL_EMBEDDED_PANEL_HEIGHT,
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
  isComingSoon?: boolean;
  /** ~1x leverage — mint/buy disabled until more ha liquidity exists. */
  depositsPaused?: boolean;
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
  isComingSoon = false,
  depositsPaused = false,
}: SailMarketActionPanelProps) {
  return (
    <aside className="flex flex-col lg:h-full">
      <div
        className={`${SAIL_EMBEDDED_FORM_PANEL} ${SAIL_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        {isComingSoon ? (
          <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>Coming soon</p>
            <p className={SAIL_ADVANCED_LIGHT_BODY}>
              This market is not live yet. Check back when it opens for minting
              and redeeming.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
              depositsPaused={depositsPaused}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
