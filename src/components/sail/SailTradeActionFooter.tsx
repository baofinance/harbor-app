"use client";

import type { SailTradePrimaryAction } from "@/utils/sailTradeFormState";
import {
  SailTradeFeeFooter,
  type SailTradeMarketFees,
} from "@/components/sail/SailTradeFeeFooter";
import { SailTradePrimaryButton } from "@/components/sail/SailTradePrimaryButton";
import { SAIL_TRADE_CANCEL_BUTTON_CLASS } from "@/components/sail/advanced/sailAdvancedStyles";

type SailTradeActionFooterProps = {
  layout: "embedded" | "modal";
  marketFees?: SailTradeMarketFees;
  activeTab: "mint" | "redeem";
  buyFeeEstimatePct?: number;
  sellFeeEstimatePct?: number;
  showEstimates?: boolean;
  action: SailTradePrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
};

export function SailTradeActionFooter({
  layout,
  marketFees,
  activeTab,
  buyFeeEstimatePct,
  sellFeeEstimatePct,
  showEstimates,
  action,
  onSubmit,
  onRetry,
  onCancel,
  showCancel = false,
}: SailTradeActionFooterProps) {
  const primaryClassName = layout === "modal" ? "flex-1" : undefined;

  return (
    <div
      className={
        layout === "embedded"
          ? "mt-auto shrink-0 space-y-2.5 border-t border-[#1E4775]/8 pt-3"
          : "mt-auto shrink-0 space-y-2.5 border-t border-[#1E4775]/8 pt-3"
      }
    >
      <SailTradeFeeFooter
        marketFees={marketFees}
        activeTab={activeTab}
        buyFeeEstimatePct={buyFeeEstimatePct}
        sellFeeEstimatePct={sellFeeEstimatePct}
        showEstimates={showEstimates}
        mode="activeTab"
      />
      <div className={layout === "modal" ? "flex gap-3" : undefined}>
        {showCancel && onCancel ? (
          <button type="button" onClick={onCancel} className={SAIL_TRADE_CANCEL_BUTTON_CLASS}>
            Cancel
          </button>
        ) : null}
        <SailTradePrimaryButton
          action={action}
          onSubmit={onSubmit}
          onRetry={onRetry}
          className={primaryClassName}
        />
      </div>
    </div>
  );
}
