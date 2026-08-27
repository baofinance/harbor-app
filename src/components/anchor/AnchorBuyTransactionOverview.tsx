"use client";

import {
  AnchorTransactionOverview,
  type AnchorTransactionOverviewProps,
} from "@/components/anchor/AnchorTransactionOverview";

export type AnchorBuyTransactionOverviewProps = Omit<
  AnchorTransactionOverviewProps,
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
    <AnchorTransactionOverview
      {...props}
      fees={
        fee
          ? [
              {
                label: fee.label ?? "Buy fee",
                percentage: fee.percentage,
                usd: fee.usd,
              },
            ]
          : undefined
      }
    />
  );
}
