"use client";

import { formatUnits } from "viem";
import { DepositTransactionOverview } from "@/components/deposit/DepositTransactionOverview";
import { formatTokenAmount, formatUSD } from "@/utils/formatters";
import { amountToUSD } from "@/utils/tokenPriceToUSD";

export type GenesisDepositTransactionOverviewProps = {
  amount: string;
  selectedAsset: string;
  displaySymbol: string;
  actualCollateralDeposit: bigint;
  userCurrentDeposit: bigint;
  newTotalDeposit: bigint;
  collateralPriceUSD: number;
  hasValidDecimals: boolean;
  needsSwap: boolean;
  isLoadingSwapQuote?: boolean;
  swapQuote?: { toAmount: bigint; fee: number } | null;
  swapQuoteError?: boolean;
  nativeTokenLabel?: string;
  isFxSAVEMarket?: boolean;
};

/** Sail-styled overview — Genesis deposit credit + optional swap fee. */
export function GenesisDepositTransactionOverview({
  amount,
  selectedAsset,
  displaySymbol,
  actualCollateralDeposit,
  userCurrentDeposit,
  newTotalDeposit,
  collateralPriceUSD,
  hasValidDecimals,
  needsSwap,
  isLoadingSwapQuote = false,
  swapQuote = null,
  swapQuoteError = false,
  nativeTokenLabel = "ETH",
  isFxSAVEMarket = false,
}: GenesisDepositTransactionOverviewProps) {
  const numericAmount = parseFloat(amount);

  if (!amount || !(numericAmount > 0)) {
    return (
      <DepositTransactionOverview
        receiveAmount={null}
        receiveSymbol={displaySymbol}
        receiveLabel="You will deposit"
        emptyMessage="Enter an amount to see your voyage deposit."
      />
    );
  }

  if (!hasValidDecimals || actualCollateralDeposit <= 0n) {
    return (
      <DepositTransactionOverview
        receiveAmount={null}
        receiveSymbol={displaySymbol}
        receiveLabel="You will deposit"
        statusMessage={
          isLoadingSwapQuote
            ? "Calculating swap…"
            : swapQuoteError
              ? "Swap quote unavailable"
              : "Calculating…"
        }
        statusVariant={swapQuoteError ? "error" : "default"}
      />
    );
  }

  const depositFmt = formatTokenAmount(
    actualCollateralDeposit,
    displaySymbol,
    collateralPriceUSD,
  );
  const depositUsd = amountToUSD(
    Number(actualCollateralDeposit) / 1e18,
    displaySymbol,
    {
      collateralPriceUSD: collateralPriceUSD || 0,
      fxSAVEPrice: collateralPriceUSD || 1.08,
      wstETHPrice: collateralPriceUSD || 0,
    },
  );

  const payDecimals =
    selectedAsset.toLowerCase() === "usdc" ||
    selectedAsset.toLowerCase() === "fxusd"
      ? 2
      : 6;
  const payAmount = numericAmount.toFixed(payDecimals);

  let sourceLine = `Paying · ${payAmount} ${selectedAsset}`;
  if (needsSwap && swapQuote && swapQuote.toAmount > 0n) {
    const targetToken = isFxSAVEMarket ? "USDC" : nativeTokenLabel;
    const targetDecimals = isFxSAVEMarket ? 6 : 18;
    const outAmt = Number(
      formatUnits(swapQuote.toAmount, targetDecimals),
    ).toFixed(targetDecimals === 6 ? 2 : 6);
    sourceLine = `Paying · ${payAmount} ${selectedAsset} → ${outAmt} ${targetToken}`;
  }

  const fees =
    needsSwap && swapQuote
      ? [
          {
            label: "Swap fee",
            hint: "Velora",
            percentage: swapQuote.fee,
          },
        ]
      : undefined;

  const currentFmt = formatTokenAmount(
    userCurrentDeposit,
    displaySymbol,
    collateralPriceUSD,
  );
  const totalFmt = formatTokenAmount(
    newTotalDeposit,
    displaySymbol,
    collateralPriceUSD,
  );
  const totalUsd = amountToUSD(Number(newTotalDeposit) / 1e18, displaySymbol, {
    collateralPriceUSD: collateralPriceUSD || 0,
    fxSAVEPrice: collateralPriceUSD || 1.08,
    wstETHPrice: collateralPriceUSD || 0,
  });

  return (
    <DepositTransactionOverview
      receiveLabel="You will deposit"
      receiveAmount={depositFmt.formatted}
      receiveSymbol={displaySymbol}
      receiveUsd={depositUsd > 0 ? depositUsd : undefined}
      receiveAmountTitle={`${depositFmt.formatted} ${displaySymbol}`}
      sourceLine={sourceLine}
      fees={fees}
      trailingRows={[
        {
          label: "Current deposit",
          value: `${currentFmt.formatted} ${displaySymbol}`,
          secondary: currentFmt.usd || undefined,
        },
        {
          label: "New voyage total",
          value: `${totalFmt.formatted} ${displaySymbol}`,
          secondary: totalUsd > 0 ? formatUSD(totalUsd) : undefined,
          emphasize: true,
        },
      ]}
    />
  );
}
