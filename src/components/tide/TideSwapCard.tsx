"use client";

import { ArrowLeftRight } from "lucide-react";
import { useTideSwap } from "@/hooks/useTideSwap";
import { TideFeatureCard } from "./TideFeatureCard";
import { TideTransactionModal } from "./TideTransactionModal";
import {
  TIDE_CARD_CONTENT_STACK,
  TIDE_FOOTER_EXTRA_BLUE_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
  TIDE_INPUT_SHELL_CLASS,
  TIDE_META_TEXT,
  TIDE_PRIMARY_BUTTON_CLASS,
  TIDE_THEME,
} from "./tideCardStyles";

export function TideSwapCard() {
  const {
    isConnected,
    balanceFormatted,
    maxBaoAmount,
    baoAmount,
    setBaoAmount,
    tideOutput,
    exceedsBalance,
    belowMinOut,
    minTideOutFormatted,
    windowOpen,
    needsApproval,
    canSwap,
    isBalanceLoading,
    isPreviewLoading,
    isSwapping,
    swapError,
    executeSwap,
    swapRateLabel,
    maxSwapConversionLabel,
    txModal,
    closeTxModal,
  } = useTideSwap();

  const theme = TIDE_THEME.blue;

  const handleMax = () => {
    if (maxBaoAmount && maxBaoAmount !== "0") {
      setBaoAmount(maxBaoAmount);
    }
  };

  return (
    <>
      <TideFeatureCard
        icon={<ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />}
        iconBadgeClass={theme.iconBadge}
        title="Swap"
        subtitle="BAO → TIDE"
        subtitleClass={theme.subtitle}
        badge="Test"
        badgeVariant="gold"
        footer={`${swapRateLabel} via distributor`}
        footerExtra={
          maxSwapConversionLabel
            ? `Max swap ${maxSwapConversionLabel}`
            : undefined
        }
        footerExtraClassName={TIDE_FOOTER_EXTRA_BLUE_CLASS}
        isConnected={isConnected}
        disconnectedMessage="Connect wallet to swap BAO for TIDE"
      >
        <div className={TIDE_CARD_CONTENT_STACK}>
          {!windowOpen ? (
            <p className={`text-center ${TIDE_META_TEXT}`}>
              Swap is only available during the distributor claim window.
            </p>
          ) : null}

          <div className={`px-4 py-3 text-center ${theme.inset}`}>
            <p className={`mb-1.5 ${TIDE_INSET_LIGHT_LABEL_CLASS}`}>
              BAO balance
            </p>
            <p className={TIDE_INSET_LIGHT_AMOUNT_SM_CLASS}>
              {isBalanceLoading ? "…" : balanceFormatted}{" "}
              <span className={TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS}>BAO</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="tide-swap-bao-amount"
              className={TIDE_INSET_LIGHT_LABEL_CLASS}
            >
              You swap
            </label>
            <div className={TIDE_INPUT_SHELL_CLASS}>
              <input
                id="tide-swap-bao-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={baoAmount}
                onChange={(e) => setBaoAmount(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-base text-[#1E4775] outline-none placeholder:text-[#1E4775]/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className={`shrink-0 text-sm font-medium ${TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS}`}>
                BAO
              </span>
              <button
                type="button"
                onClick={handleMax}
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-[#1E4775]/5 ${theme.maxButton}`}
              >
                Max
              </button>
            </div>
            {exceedsBalance ? (
              <p className="text-xs text-[#FF8A7A]">Insufficient BAO balance</p>
            ) : null}
            {belowMinOut ? (
              <p className="text-xs text-[#FF8A7A]">
                Minimum swap output is {minTideOutFormatted} TIDE (~57 BAO)
              </p>
            ) : null}
          </div>

          <div className="space-y-3.5 sm:space-y-4">
            <div className="space-y-1.5">
              <p className={TIDE_INSET_LIGHT_LABEL_CLASS}>You receive</p>
              <div
                className={`flex items-center justify-between px-3 py-2.5 ${theme.highlight}`}
              >
                <span className="font-mono text-lg tabular-nums text-[#1E4775]">
                  {isPreviewLoading && baoAmount ? "…" : tideOutput || "0"}
                </span>
                <span className={`text-sm font-medium ${TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS}`}>
                  TIDE
                </span>
              </div>
            </div>

            {swapError ? (
              <p className="rounded-lg border border-[#FF8A7A]/30 bg-[#FF8A7A]/10 px-3 py-2 text-xs text-[#FF8A7A]">
                {swapError}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canSwap}
              onClick={() => void executeSwap()}
              className={TIDE_PRIMARY_BUTTON_CLASS}
            >
              {isSwapping
                ? needsApproval
                  ? "Approving…"
                  : "Swapping…"
                : needsApproval
                  ? "Approve & Swap"
                  : "Swap"}
            </button>
          </div>
        </div>
      </TideFeatureCard>

      <TideTransactionModal
        isOpen={txModal.isOpen}
        status={txModal.status}
        title={txModal.title}
        message={txModal.message}
        txHash={txModal.txHash}
        onClose={closeTxModal}
      />
    </>
  );
}
