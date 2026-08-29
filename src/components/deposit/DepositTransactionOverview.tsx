"use client";

import {
  ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER,
  ANCHOR_TRANSACTION_OVERVIEW_INNER,
  ANCHOR_TRANSACTION_OVERVIEW_LABEL,
  ANCHOR_TRANSACTION_OVERVIEW_WRAPPER,
  DEPOSIT_OVERVIEW_CARD_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type TransactionOverviewFee = {
  label: string;
  percentage: number;
  usd?: number;
};

export type DepositTransactionOverviewProps = {
  receiveAmount: string | null;
  receiveSymbol: string;
  receiveUsd?: number;
  receiveLabel?: string;
  /** e.g. "From wstETH · 0.0049" */
  sourceLine?: string;
  emptyMessage?: string;
  /** Loading / error / placeholder while receive is not ready */
  statusMessage?: string;
  statusVariant?: "default" | "error";
  fees?: TransactionOverviewFee[];
  /** Sum of fee USD values when multiple fees apply (do not add percentages). */
  totalFeeUsd?: number;
  bonus?: { percentage: number };
  bannerMessage?: string;
};

/** Compact buy / sell summary card — pinned above the action footer. */
export function DepositTransactionOverview({
  receiveAmount,
  receiveSymbol,
  receiveUsd,
  receiveLabel = "You will receive",
  sourceLine,
  emptyMessage = "Enter an amount to see what you'll receive.",
  statusMessage,
  statusVariant = "default",
  fees,
  totalFeeUsd,
  bonus,
  bannerMessage,
}: DepositTransactionOverviewProps) {
  const hasReceive =
    receiveAmount !== null && receiveAmount !== "..." && receiveAmount.length > 0;

  return (
    <div className={ANCHOR_TRANSACTION_OVERVIEW_WRAPPER}>
      <label className={ANCHOR_TRANSACTION_OVERVIEW_LABEL}>
        Transaction Overview
      </label>
      <div className={DEPOSIT_OVERVIEW_CARD_CLASS}>
        {bannerMessage ? (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {bannerMessage}
          </div>
        ) : null}

        {!hasReceive ? (
          <div
            className={`text-xs ${
              statusVariant === "error" ? "text-red-600" : "text-[#1E4775]/70"
            }`}
          >
            {statusMessage ?? emptyMessage}
          </div>
        ) : (
          <div className={ANCHOR_TRANSACTION_OVERVIEW_INNER}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#1E4775]/70">
                  {receiveLabel}
                </div>
                {sourceLine ? (
                  <div className="mt-0.5 truncate text-[11px] leading-tight text-[#1E4775]/50">
                    {sourceLine}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-base font-bold leading-tight text-[#1E4775]">
                  {receiveAmount} {receiveSymbol}
                </div>
                {receiveUsd !== undefined && receiveUsd > 0 ? (
                  <div className="font-mono text-[11px] text-[#1E4775]/50">
                    $
                    {receiveUsd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {(fees?.length || bonus || (totalFeeUsd !== undefined && totalFeeUsd > 0)) && (
              <div className={ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER}>
                {fees?.map((fee) => (
                  <div
                    key={fee.label}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[#1E4775]/70">{fee.label}</span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        fee.percentage > 2 ? "text-red-600" : "text-[#1E4775]"
                      }`}
                    >
                      {fee.percentage.toFixed(2)}%
                      {fee.usd !== undefined && fee.usd > 0
                        ? ` · $${fee.usd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : ""}
                    </span>
                  </div>
                ))}
                {totalFeeUsd !== undefined && totalFeeUsd > 0 && (fees?.length ?? 0) > 1 ? (
                  <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-[#1E4775]/10 pt-1.5">
                    <span className="font-medium text-[#1E4775]/80">Total fees</span>
                    <span className="font-mono font-semibold tabular-nums text-[#1E4775]">
                      $
                      {totalFeeUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ) : null}
                {bonus ? (
                  <div className="flex items-center justify-between gap-2 text-green-700">
                    <span>Bonus</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {bonus.percentage.toFixed(2)}%
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
