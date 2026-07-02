"use client";

import type { DepositPrimaryAction } from "@/utils/depositFormState";
import {
  SailTradeFeeFooter,
  type SailTradeMarketFees,
} from "@/components/sail/SailTradeFeeFooter";
import { DepositActionFooter } from "@/components/deposit/DepositActionFooter";

type SailTradeActionFooterProps = {
  layout: "embedded" | "modal";
  marketFees?: SailTradeMarketFees;
  activeTab: "mint" | "redeem";
  buyFeeEstimatePct?: number;
  sellFeeEstimatePct?: number;
  showEstimates?: boolean;
  action: DepositPrimaryAction;
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
  return (
    <DepositActionFooter
      layout={layout}
      action={action}
      onSubmit={onSubmit}
      onRetry={onRetry}
      onCancel={onCancel}
      showCancel={showCancel}
      feeFooter={
        <SailTradeFeeFooter
          marketFees={marketFees}
          activeTab={activeTab}
          buyFeeEstimatePct={buyFeeEstimatePct}
          sellFeeEstimatePct={sellFeeEstimatePct}
          showEstimates={showEstimates}
          mode="activeTab"
        />
      }
    />
  );
}
