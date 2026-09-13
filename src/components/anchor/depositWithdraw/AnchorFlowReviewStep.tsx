"use client";

import { TokenLogo } from "@/components/shared";
import {
  DEPOSIT_SECTION_LABEL_CLASS,
  DEPOSIT_TAG_CORAL_CLASS,
  DEPOSIT_TAG_MINT_CLASS,
  DEPOSIT_TAG_NEUTRAL_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type AnchorFlowReviewBand = {
  /** Semantic role for layout (receive gets mint wash + larger type). */
  role: "from" | "route" | "receive" | "meta";
  label: string;
  /** Left primary line (e.g. "Collateral pool"). */
  primary?: string;
  /** Left secondary line (e.g. "Auto · fxUSD – ETH"). */
  secondary?: string;
  /** Right-side value. */
  value: string;
  valueTitle?: string;
  /** Optional mint chip instead of plain value (route destination). */
  chip?: string;
  iconSymbol?: string;
};

export type AnchorFlowReviewFee = {
  label: string;
  value: string;
  tone?: "coral" | "mint" | "neutral";
};

export type AnchorFlowReviewActionStep = {
  title: string;
  detail?: string;
  feeLabel?: string;
  feeTone?: "coral" | "mint" | "neutral";
};

export type AnchorFlowReviewStepProps = {
  title?: string;
  subtitle?: string;
  bands: readonly AnchorFlowReviewBand[];
  /** Plain-text fee rows (no tags) under the summary card. */
  fees?: readonly AnchorFlowReviewFee[];
  steps: readonly AnchorFlowReviewActionStep[];
  /** Quiet line under the transaction steps (e.g. wallet prompt hint). */
  stepsFooterHint?: string;
};

function reviewTagClass(tone: NonNullable<AnchorFlowReviewFee["tone"]>): string {
  if (tone === "coral") return DEPOSIT_TAG_CORAL_CLASS;
  if (tone === "mint") return DEPOSIT_TAG_MINT_CLASS;
  return DEPOSIT_TAG_NEUTRAL_CLASS;
}

export function AnchorFlowReviewStep({
  title = "Review",
  subtitle = "Confirm the details below before submitting.",
  bands,
  fees = [],
  steps,
  stepsFooterHint,
}: AnchorFlowReviewStepProps) {
  const receiveBand = bands.find((b) => b.role === "receive");
  const otherBands = bands.filter((b) => b.role !== "receive");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className={DEPOSIT_SECTION_LABEL_CLASS}>{title}</p>
        <p className="px-0.5 text-[11px] leading-snug text-[#1E4775]/55">
          {subtitle}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#1E4775]/12 bg-white/90">
        <div className="divide-y divide-[#1E4775]/10">
          {otherBands.map((band) => (
            <div
              key={`${band.role}-${band.label}-${band.value}`}
              className="flex items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E4775]/45">
                  {band.label}
                </p>
                {band.primary ? (
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#1E4775]">
                    {band.primary}
                  </p>
                ) : null}
                {band.secondary ? (
                  <p className="truncate text-[10px] text-[#1E4775]/50">
                    {band.secondary}
                  </p>
                ) : null}
              </div>
              <div className="flex max-w-[55%] shrink-0 items-center justify-end gap-1.5">
                {band.iconSymbol ? (
                  <TokenLogo symbol={band.iconSymbol} size={16} />
                ) : null}
                {band.chip ? (
                  <span className={reviewTagClass("mint")}>{band.chip}</span>
                ) : (
                  <p
                    className="text-right text-xs font-semibold tabular-nums text-[#1E4775]"
                    title={band.valueTitle}
                  >
                    {band.value}
                  </p>
                )}
              </div>
            </div>
          ))}

          {receiveBand ? (
            <div className="flex items-end justify-between gap-3 bg-harbor-mint/30 px-3 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E4775]/55">
                  {receiveBand.label}
                </p>
                {receiveBand.secondary || receiveBand.primary ? (
                  <p className="mt-0.5 text-[11px] tabular-nums text-[#1E4775]/55">
                    {receiveBand.secondary || receiveBand.primary}
                  </p>
                ) : null}
              </div>
              <p
                className="max-w-[62%] shrink-0 text-right font-mono text-lg font-bold leading-tight tabular-nums text-[#1E4775] sm:text-xl"
                title={receiveBand.valueTitle}
              >
                {receiveBand.value}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {fees.length > 0 ? (
        <div className="space-y-1">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Fees</p>
          <div className="space-y-1 px-0.5">
            {fees.map((fee) => (
              <div
                key={`${fee.label}-${fee.value}`}
                className="flex items-baseline justify-between gap-3 text-[11px] leading-snug"
              >
                <span className="text-[#1E4775]/55">{fee.label}</span>
                <span className="shrink-0 tabular-nums font-medium text-[#1E4775]">
                  {fee.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <p className={DEPOSIT_SECTION_LABEL_CLASS}>Transaction steps</p>
            <p className="text-[10px] font-medium tabular-nums text-[#1E4775]/45">
              {steps.length} action{steps.length === 1 ? "" : "s"}
            </p>
          </div>
          <ol className="space-y-2">
            {steps.map((step, index) => {
              const isFirst = index === 0;
              const isLast = index === steps.length - 1;
              return (
                <li
                  key={`${index}-${step.title}`}
                  className="relative flex items-center gap-2.5"
                >
                  {!isLast ? (
                    <span
                      aria-hidden
                      className="absolute left-[10px] top-1/2 z-0 h-[calc(100%+0.5rem)] w-px -translate-x-1/2 bg-[#1E4775]/20"
                    />
                  ) : null}
                  <span
                    className={`relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                      isFirst
                        ? "bg-[#1E4775] text-white"
                        : "border border-[#1E4775]/45 bg-white text-[#1E4775]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-[#1E4775]/12 bg-white/90 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1E4775]">
                          {step.title}
                        </p>
                        {step.detail ? (
                          <p className="mt-0.5 text-[11px] leading-snug text-[#1E4775]/55">
                            {step.detail}
                          </p>
                        ) : null}
                      </div>
                      {step.feeLabel ? (
                        <span
                          className={`shrink-0 ${reviewTagClass(step.feeTone ?? "neutral")}`}
                        >
                          {step.feeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {stepsFooterHint ? (
            <p className="px-0.5 pt-0.5 text-center text-[10px] leading-snug text-[#1E4775]/45">
              {stepsFooterHint}
            </p>
          ) : null}
        </div>
      ) : stepsFooterHint ? (
        <p className="px-0.5 text-center text-[10px] leading-snug text-[#1E4775]/45">
          {stepsFooterHint}
        </p>
      ) : null}
    </div>
  );
}
