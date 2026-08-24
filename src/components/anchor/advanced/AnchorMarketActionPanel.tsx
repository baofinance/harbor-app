"use client";

import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import type { DefinedMarket } from "@/config/markets";
import {
  AnchorEmbeddedClaimBar,
  type AnchorEmbeddedClaimBarProps,
} from "./AnchorEmbeddedClaimBar";
import {
  ANCHOR_ADVANCED_LIGHT_BODY,
  ANCHOR_ADVANCED_LIGHT_SECTION_TITLE,
  ANCHOR_EMBEDDED_FORM_PANEL,
  ANCHOR_EMBEDDED_PANEL_HEIGHT,
} from "./anchorAdvancedStyles";

export type AnchorMarketActionPanelProps = {
  marketId: string;
  market: DefinedMarket;
  initialTab?: "deposit" | "withdraw";
  onSuccess?: () => void;
  allMarkets?: Array<{ marketId: string; market: DefinedMarket }>;
  positionsMap?: Record<string, { collateralPool: bigint; sailPool: bigint }>;
  isComingSoon?: boolean;
  claimBar?: AnchorEmbeddedClaimBarProps | null;
};

/** Embedded Deposit | Withdraw panel — wraps AnchorDepositWithdrawModal inline. */
export function AnchorMarketActionPanel({
  marketId,
  market,
  initialTab = "deposit",
  onSuccess,
  allMarkets,
  positionsMap,
  isComingSoon = false,
  claimBar = null,
}: AnchorMarketActionPanelProps) {
  return (
    <aside className="flex w-full min-w-0 flex-col">
      <div
        className={`${ANCHOR_EMBEDDED_FORM_PANEL} ${ANCHOR_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        {isComingSoon ? (
          <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className={ANCHOR_ADVANCED_LIGHT_SECTION_TITLE}>Coming soon</p>
            <p className={ANCHOR_ADVANCED_LIGHT_BODY}>
              This market is not live yet. Check back when deposits open.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 w-full flex-col">
            <AnchorDepositWithdrawModal
              embedded
              isOpen
              onClose={() => {}}
              marketId={marketId}
              market={market}
              initialTab={initialTab}
              onSuccess={onSuccess}
              simpleMode
              bestPoolType="collateral"
              allMarkets={allMarkets}
              positionsMap={positionsMap}
            />
          </div>
        )}
      </div>
      {claimBar ? <AnchorEmbeddedClaimBar {...claimBar} /> : null}
    </aside>
  );
}
