"use client";

import { amountToUSD } from "@/utils/tokenPriceToUSD";
import { formatEther } from "viem";

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
      <div className="space-y-0.5 px-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-[#1E4775]/65">You receive</span>
          <div className="text-right">
            <p className="font-mono text-base font-semibold tabular-nums text-[#1E4775]">
              ~{leveragedAmount.toFixed(6)} {leveragedTokenSymbol}
            </p>
            {usdValue > 0 ? (
              <p className="font-mono text-[11px] tabular-nums text-[#1E4775]/50">
                ${usdValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-right text-[11px] italic text-[#1E4775]/45">
          {numericAmount.toFixed(6)} {paySymbol} ≈ {leveragedAmount.toFixed(6)}{" "}
          {leveragedTokenSymbol}
        </p>
      </div>
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
    <div className="space-y-0.5 px-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-[#1E4775]/65">You receive</span>
        <div className="text-right">
          <p className="font-mono text-base font-semibold tabular-nums text-[#1E4775]">
            ~{collateralAmount.toFixed(6)} {collateralSymbol}
          </p>
          {usdValue > 0 ? (
            <p className="font-mono text-[11px] tabular-nums text-[#1E4775]/50">
              ${usdValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-right text-[11px] italic text-[#1E4775]/45">
        {numericAmount.toFixed(6)} {leveragedTokenSymbol} ≈ {collateralAmount.toFixed(6)}{" "}
        {collateralSymbol}
      </p>
    </div>
  );
}
