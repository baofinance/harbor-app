"use client";

import { amountToUSD } from "@/utils/tokenPriceToUSD";
import { formatEther } from "viem";
import { DepositTransactionOverview } from "@/components/deposit/DepositTransactionOverview";

export type SailTradeTransactionOverviewProps = {
  activeTab: "mint" | "redeem";
  parsedAmount: bigint | null | undefined;
  amount: string;
  expectedMintOutput?: bigint | null;
  expectedRedeemOutput?: bigint | null;
  leveragedTokenSymbol: string;
  collateralSymbol: string;
  selectedDepositAsset?: string;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
  leveragedTokenPriceUSD?: number;
};

export function SailTradeTransactionOverview({
  activeTab,
  parsedAmount,
  amount,
  expectedMintOutput,
  expectedRedeemOutput,
  leveragedTokenSymbol,
  collateralSymbol,
  selectedDepositAsset,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
  leveragedTokenPriceUSD,
}: SailTradeTransactionOverviewProps) {
  const parsed = parsedAmount ?? 0n;
  const numericAmount = parseFloat(amount);

  if (!amount || numericAmount <= 0 || parsed <= 0n) {
    return (
      <DepositTransactionOverview
        receiveAmount={null}
        receiveSymbol={
          activeTab === "mint" ? leveragedTokenSymbol : collateralSymbol
        }
        emptyMessage="Enter an amount to see what you'll receive."
      />
    );
  }

  if (activeTab === "mint") {
    if (!expectedMintOutput || expectedMintOutput <= 0n) {
      return (
        <DepositTransactionOverview
          receiveAmount={null}
          receiveSymbol={leveragedTokenSymbol}
          statusMessage="Calculating…"
        />
      );
    }

    const leveragedAmount = Number(formatEther(expectedMintOutput));
    const usdValue = amountToUSD(
      leveragedAmount,
      leveragedTokenSymbol,
      {
        ethPrice: ethPrice ?? 0,
        wstETHPrice: wstETHPrice ?? 0,
        fxSAVEPrice: fxSAVEPrice ?? 1.08,
        leveragedPriceUSD: leveragedTokenPriceUSD ?? 0,
      },
      collateralSymbol,
    );
    const paySymbol = selectedDepositAsset || collateralSymbol;

    return (
      <DepositTransactionOverview
        receiveAmount={`~${leveragedAmount.toFixed(6)}`}
        receiveSymbol={leveragedTokenSymbol}
        receiveUsd={usdValue > 0 ? usdValue : undefined}
        sourceLine={`From ${paySymbol} · ${numericAmount.toFixed(6)}`}
      />
    );
  }

  if (!expectedRedeemOutput || expectedRedeemOutput <= 0n) {
    return (
      <DepositTransactionOverview
        receiveAmount={null}
        receiveSymbol={collateralSymbol}
        statusMessage="Calculating…"
      />
    );
  }

  const collateralAmount = Number(formatEther(expectedRedeemOutput));
  const usdValue = amountToUSD(collateralAmount, collateralSymbol, {
    ethPrice: ethPrice ?? 0,
    wstETHPrice: wstETHPrice ?? 0,
    fxSAVEPrice: fxSAVEPrice ?? 1.08,
  });

  return (
    <DepositTransactionOverview
      receiveAmount={`~${collateralAmount.toFixed(6)}`}
      receiveSymbol={collateralSymbol}
      receiveUsd={usdValue > 0 ? usdValue : undefined}
      sourceLine={`From ${leveragedTokenSymbol} · ${numericAmount.toFixed(6)}`}
    />
  );
}
