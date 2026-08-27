"use client";

import {
  ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER,
  ANCHOR_TRANSACTION_OVERVIEW_INNER,
  ANCHOR_TRANSACTION_OVERVIEW_LABEL,
  ANCHOR_TRANSACTION_OVERVIEW_WRAPPER,
  DEPOSIT_AMOUNT_CARD_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type TransactionOverviewFee = {
  label: string;
  percentage: number;
  usd?: number;
};

export type AnchorTransactionOverviewProps = {
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
  bonus?: { percentage: number };
  bannerMessage?: string;
  /** Tighter layout for withdraw step 1 */
  compact?: boolean;
};

/** Compact buy / withdraw summary — shared card above the action footer. */
export function AnchorTransactionOverview({
  receiveAmount,
  receiveSymbol,
  receiveUsd,
  receiveLabel = "You will receive",
  sourceLine,
  emptyMessage = "Enter an amount to see what you'll receive.",
  statusMessage,
  statusVariant = "default",
  fees,
  bonus,
  bannerMessage,
  compact = false,
}: AnchorTransactionOverviewProps) {
  const hasReceive =
    receiveAmount !== null && receiveAmount !== "..." && receiveAmount.length > 0;

  return (
    <div className={compact ? "shrink-0 pt-1" : ANCHOR_TRANSACTION_OVERVIEW_WRAPPER}>
      <label
        className={
          compact
            ? "block text-xs font-semibold text-[#1E4775] mb-0.5"
            : ANCHOR_TRANSACTION_OVERVIEW_LABEL
        }
      >
        Transaction Overview
      </label>
      <div
        className={
          compact
            ? "rounded-lg border border-[#1E4775]/12 bg-white/70 px-2 py-1.5 shadow-sm backdrop-blur-sm"
            : DEPOSIT_AMOUNT_CARD_CLASS
        }
      >
        {bannerMessage ? (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {bannerMessage}
          </div>
        ) : null}

        {!hasReceive ? (
          <div
            className={`${compact ? "text-[11px]" : "text-xs"} ${
              statusVariant === "error" ? "text-red-600" : "text-[#1E4775]/70"
            }`}
          >
            {statusMessage ?? emptyMessage}
          </div>
        ) : (
          <div className={compact ? "space-y-1" : ANCHOR_TRANSACTION_OVERVIEW_INNER}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div
                  className={`font-medium text-[#1E4775]/70 ${
                    compact ? "text-xs" : "text-sm"
                  }`}
                >
                  {receiveLabel}
                </div>
                {sourceLine ? (
                  <div className="text-[11px] text-[#1E4775]/50 mt-0.5">
                    {sourceLine}
                  </div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-bold text-[#1E4775] font-mono leading-tight ${
                    compact ? "text-sm" : "text-base"
                  }`}
                >
                  {receiveAmount} {receiveSymbol}
                </div>
                {receiveUsd !== undefined && receiveUsd > 0 ? (
                  <div className="text-[11px] text-[#1E4775]/50 font-mono">
                    $
                    {receiveUsd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {(fees?.length || bonus) && (
              <div className={ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER}>
                {fees?.map((fee) => (
                  <div
                    key={fee.label}
                    className="flex justify-between items-center gap-2"
                  >
                    <span className="text-[#1E4775]/70">{fee.label}</span>
                    <span
                      className={`font-semibold font-mono tabular-nums ${
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
                {bonus ? (
                  <div className="flex justify-between items-center gap-2 text-green-700">
                    <span>Bonus</span>
                    <span className="font-semibold font-mono tabular-nums">
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
