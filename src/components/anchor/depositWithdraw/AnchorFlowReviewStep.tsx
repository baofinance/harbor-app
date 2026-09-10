"use client";

import { TokenLogo } from "@/components/shared";
import { DEPOSIT_SECTION_LABEL_CLASS } from "@/components/deposit/depositFlowStyles";

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
  tone: "coral" | "mint" | "neutral";
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
  fees?: readonly AnchorFlowReviewFee[];
  steps: readonly AnchorFlowReviewActionStep[];
};

function feeChipClass(tone: AnchorFlowReviewFee["tone"]): string {
  if (tone === "coral") {
    return "border-harbor-coral/45 bg-harbor-coral/15 text-[#D45A4A]";
  }
  if (tone === "mint") {
    return "border-[#2A7A5E]/25 bg-harbor-mint/45 text-[#1A5C45]";
  }
  return "border-[#1E4775]/15 bg-[#1E4775]/8 text-[#1E4775]/75";
}

export function AnchorFlowReviewStep({
  title = "Review",
  subtitle = "Confirm the details below before submitting.",
  bands,
  fees = [],
  steps,
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
                  <span className="rounded-full border border-[#2A7A5E]/20 bg-harbor-mint/40 px-2 py-0.5 text-[11px] font-semibold text-[#1A5C45]">
                    {band.chip}
                  </span>
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

          {fees.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
              {fees.map((fee) => (
                <div
                  key={`${fee.label}-${fee.value}`}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-[10px] font-medium text-[#1E4775]/55">
                    {fee.label}
                  </span>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${feeChipClass(fee.tone)}`}
                  >
                    {fee.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <p className={DEPOSIT_SECTION_LABEL_CLASS}>Transaction steps</p>
            <p className="text-[10px] font-medium tabular-nums text-[#1E4775]/45">
              {steps.length} action{steps.length === 1 ? "" : "s"}
            </p>
          </div>
          <ol className="relative space-y-2">
            {steps.map((step, index) => {
              const isFirst = index === 0;
              const isLast = index === steps.length - 1;
              return (
                <li key={`${index}-${step.title}`} className="relative flex gap-2.5">
                  <div className="relative flex w-5 shrink-0 flex-col items-center">
                    {!isLast ? (
                      <span
                        aria-hidden
                        className="absolute top-5 bottom-[-0.5rem] w-px bg-[#1E4775]/20"
                      />
                    ) : null}
                    <span
                      className={`relative z-[1] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                        isFirst
                          ? "bg-[#1E4775] text-white"
                          : "border border-[#1E4775]/45 bg-white text-[#1E4775]"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-[#1E4775]/12 bg-white/90 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold text-[#1E4775]">
                        {step.title}
                      </p>
                      {step.feeLabel ? (
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${feeChipClass(step.feeTone ?? "neutral")}`}
                        >
                          {step.feeLabel}
                        </span>
                      ) : null}
                    </div>
                    {step.detail ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-[#1E4775]/55">
                        {step.detail}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
