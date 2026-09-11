"use client";

import { DepositTransactionOverview } from "@/components/deposit/DepositTransactionOverview";
import { formatTokenAmount } from "@/utils/formatters";
import { amountToUSD } from "@/utils/tokenPriceToUSD";

export type GenesisWithdrawTransactionOverviewProps = {
  amount: string;
  collateralSymbol: string;
  userDeposit: bigint;
  withdrawAmount: bigint;
  remainingDeposit: bigint;
  collateralPriceUSD?: number;
  hasPreview: boolean;
};

/** Sail-styled overview — Genesis withdraw receive + remaining deposit. */
export function GenesisWithdrawTransactionOverview({
  amount,
  collateralSymbol,
  userDeposit,
  withdrawAmount,
  remainingDeposit,
  collateralPriceUSD,
  hasPreview,
}: GenesisWithdrawTransactionOverviewProps) {
  if (!hasPreview) {
    return (
      <DepositTransactionOverview
        receiveAmount={null}
        receiveSymbol={collateralSymbol}
        emptyMessage="Enter an amount to see what you'll receive."
      />
    );
  }

  const withdrawFmt = formatTokenAmount(
    withdrawAmount,
    collateralSymbol,
    collateralPriceUSD,
  );
  const depositFmt = formatTokenAmount(
    userDeposit,
    collateralSymbol,
    collateralPriceUSD,
  );
  const remainingFmt = formatTokenAmount(
    remainingDeposit,
    collateralSymbol,
    collateralPriceUSD,
  );

  const receiveUsd = amountToUSD(
    Number(withdrawAmount) / 1e18,
    collateralSymbol,
    {
      collateralPriceUSD: collateralPriceUSD || 0,
      fxSAVEPrice: collateralPriceUSD || 1.08,
      wstETHPrice: collateralPriceUSD || 0,
    },
  );

  return (
    <DepositTransactionOverview
      receiveLabel="You will receive"
      receiveAmount={withdrawFmt.formatted}
      receiveSymbol={collateralSymbol}
      receiveUsd={receiveUsd > 0 ? receiveUsd : undefined}
      sourceLine={`Voyage deposit · ${depositFmt.formatted} ${collateralSymbol}`}
      trailingRows={[
        {
          label: "Remaining after withdraw",
          value: `${remainingFmt.formatted} ${collateralSymbol}`,
          secondary: remainingFmt.usd || undefined,
          emphasize: true,
        },
      ]}
    />
  );
}
