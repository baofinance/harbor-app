"use client";

import {
  DepositTransactionOverview,
  type DepositTransactionOverviewProps,
} from "@/components/deposit/DepositTransactionOverview";

export type AnchorBuyTransactionOverviewProps = Omit<
  DepositTransactionOverviewProps,
  "fees" | "receiveLabel" | "statusMessage" | "statusVariant" | "bannerMessage" | "bonus"
> & {
  fee?: {
    label?: string;
    percentage: number;
    usd?: number;
  };
};

/** Deposit / mint transaction overview — thin wrapper over shared overview card. */
export function AnchorBuyTransactionOverview({
  fee,
  ...props
}: AnchorBuyTransactionOverviewProps) {
  return (
    <DepositTransactionOverview
      {...props}
      fees={
        fee
          ? [
              {
                label: fee.label ?? "Mint fee",
                percentage: fee.percentage,
                usd: fee.usd,
              },
            ]
          : undefined
      }
    />
  );
}
