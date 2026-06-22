"use client";

import { ArrowLeftRight } from "lucide-react";
import { useTideSwap } from "@/hooks/useTideSwap";
import { TideFeatureCard } from "./TideFeatureCard";
import { TideTransactionModal } from "./TideTransactionModal";
import { TIDE_THEME } from "./tideCardStyles";

export function TideSwapCard() {
  const {
    isConnected,
    balanceFormatted,
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
    txModal,
    closeTxModal,
  } = useTideSwap();

  const theme = TIDE_THEME.blue;

  const handleMax = () => {
    if (balanceFormatted && balanceFormatted !== "0") {
      setBaoAmount(balanceFormatted.replace(/,/g, ""));
    }
  };

  return (
    <>
      <TideFeatureCard
      icon={
        <ArrowLeftRight
          className={`h-5 w-5 ${theme.iconText}`}
          strokeWidth={1.75}
        />
      }
      iconBgClass={theme.iconBg}
      title="Swap"
      subtitle="BAO → TIDE"
      subtitleClass={theme.subtitle}
      footer={`${swapRateLabel} via distributor`}
      isConnected={isConnected}
      disconnectedMessage="Connect wallet to swap BAO for TIDE"
    >
      <div className="flex w-full flex-col gap-4">
        {!windowOpen ? (
          <p className="text-center text-xs text-white/45">
            Swap is only available during the distributor claim window.
          </p>
        ) : null}

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/45">BAO balance</span>
          <span className="font-mono tabular-nums text-white">
            {isBalanceLoading ? "…" : balanceFormatted}
          </span>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="tide-swap-bao-amount"
            className="text-xs uppercase tracking-wide text-white/45"
          >
            You pay
          </label>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${theme.highlight}`}
          >
            <input
              id="tide-swap-bao-amount"
              type="number"
              min="0"
              step="any"
              placeholder="0.0"
              value={baoAmount}
              onChange={(e) => setBaoAmount(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-base text-white outline-none placeholder:text-white/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-sm font-medium text-white/60">BAO</span>
            <button
              type="button"
              onClick={handleMax}
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-white/5 ${theme.maxButton}`}
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

        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-white/45">
            You receive
          </p>
          <div
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${theme.highlight}`}
          >
            <span className="font-mono text-lg tabular-nums text-white">
              {isPreviewLoading && baoAmount ? "…" : tideOutput || "0"}
            </span>
            <span className="text-sm font-medium text-white/60">TIDE</span>
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
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${theme.button}`}
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
