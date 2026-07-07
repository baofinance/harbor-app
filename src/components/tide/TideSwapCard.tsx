"use client";

import { ArrowLeftRight } from "lucide-react";
import { useTideSwap } from "@/hooks/useTideSwap";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_CARD_CONTENT_STACK,
  TIDE_FIELD_LABEL_CLASS,
  TIDE_FOOTER_EXTRA_BLUE_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INPUT_FIELD_WITH_MAX_CLASS,
  TIDE_MAX_BUTTON_CLASS,
  TIDE_META_TEXT,
  TIDE_OVERVIEW_PANEL_SHELL,
  TIDE_PRIMARY_BUTTON_CLASS,
  TIDE_THEME,
} from "./tideCardStyles";

export function TideSwapCard() {
  const {
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
  } = useTideSwap();

  const theme = TIDE_THEME.blue;

  const handleMax = () => {
    if (maxBaoAmount && maxBaoAmount !== "0") {
      setBaoAmount(maxBaoAmount);
    }
  };

  const inputBorderClass = exceedsBalance
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
    : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20";

  return (
    <TideFeatureCard
      icon={<ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />}
      iconBadgeClass={theme.iconBadge}
      title="Swap"
      subtitle="BAO → TIDE"
      subtitleClass={theme.subtitle}
      footer={`${swapRateLabel} via distributor`}
      footerExtra={
        maxSwapConversionLabel
          ? `Max swap ${maxSwapConversionLabel}`
          : undefined
      }
      footerExtraClassName={TIDE_FOOTER_EXTRA_BLUE_CLASS}
    >
      <div className={TIDE_CARD_CONTENT_STACK}>
        {!windowOpen ? (
          <p className={`text-center ${TIDE_META_TEXT}`}>
            Swap is only available during the distributor claim window.
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className={TIDE_FIELD_LABEL_CLASS}>BAO balance</span>
            <span className="font-mono tabular-nums text-[#1E4775]/70">
              {isBalanceLoading ? "…" : balanceFormatted}{" "}
              <span className="font-sans">BAO</span>
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <span className={TIDE_FIELD_LABEL_CLASS}>You swap</span>
          <div className="relative">
            <input
              id="tide-swap-bao-amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0.0"
              value={baoAmount}
              onChange={(e) => setBaoAmount(e.target.value)}
              className={`${TIDE_INPUT_FIELD_WITH_MAX_CLASS} ${inputBorderClass}`}
            />
            <button
              type="button"
              onClick={handleMax}
              className={TIDE_MAX_BUTTON_CLASS}
            >
              MAX
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

        <div className="space-y-2">
          <span className={TIDE_FIELD_LABEL_CLASS}>You receive</span>
          <div
            className={`flex items-center justify-between ${TIDE_OVERVIEW_PANEL_SHELL}`}
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
    </TideFeatureCard>
  );
}
