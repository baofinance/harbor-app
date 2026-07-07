"use client";

import { amountToUSD } from "@/utils/tokenPriceToUSD";
import { formatEther } from "viem";
import { DepositReceivePreview } from "@/components/deposit/DepositReceivePreview";

export type SailTradeReceivePreviewProps = {
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

export function SailTradeReceivePreview({
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
}: SailTradeReceivePreviewProps) {
  const parsed = parsedAmount ?? 0n;
  const numericAmount = parseFloat(amount);
  if (!amount || numericAmount <= 0 || parsed <= 0n) {
    return null;
  }

  if (activeTab === "mint") {
    if (!expectedMintOutput || expectedMintOutput <= 0n) return null;

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
      <DepositReceivePreview
        visible
        primaryAmount={`~${leveragedAmount.toFixed(6)}`}
        primarySymbol={leveragedTokenSymbol}
        usdValue={usdValue}
        detailsLine={`${numericAmount.toFixed(6)} ${paySymbol} ≈ ${leveragedAmount.toFixed(6)} ${leveragedTokenSymbol}`}
      />
    );
  }

  if (!expectedRedeemOutput || expectedRedeemOutput <= 0n) return null;

  const collateralAmount = Number(formatEther(expectedRedeemOutput));
  const usdValue = amountToUSD(collateralAmount, collateralSymbol, {
    ethPrice: ethPrice ?? 0,
    wstETHPrice: wstETHPrice ?? 0,
    fxSAVEPrice: fxSAVEPrice ?? 1.08,
  });

  return (
    <DepositReceivePreview
      visible
      primaryAmount={`~${collateralAmount.toFixed(6)}`}
      primarySymbol={collateralSymbol}
      usdValue={usdValue}
      detailsLine={`${numericAmount.toFixed(6)} ${leveragedTokenSymbol} ≈ ${collateralAmount.toFixed(6)} ${collateralSymbol}`}
    />
  );
}
