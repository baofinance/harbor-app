"use client";

import type { ComponentProps } from "react";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";

export type SailTradeAmountCardProps = ComponentProps<typeof DepositAmountCard> & {
  activeTab: "mint" | "redeem";
};

export function SailTradeAmountCard({
  activeTab,
  tokenSelector,
  ...props
}: SailTradeAmountCardProps) {
  return (
    <DepositAmountCard
      {...props}
      tokenSelector={tokenSelector}
      showTokenSelector={activeTab === "mint" && !!tokenSelector}
      tokenRowLabel="Pay with"
    />
  );
}
