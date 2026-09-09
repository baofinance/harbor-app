"use client";

import { DEPOSIT_SECTION_LABEL_CLASS } from "@/components/deposit/depositFlowStyles";

export type AnchorFlowReviewDetail = {
  label: string;
  value: string;
  hint?: string;
  /** Full-precision amount for hover when `value` is truncated. */
  valueTitle?: string;
};

export type AnchorFlowReviewStepProps = {
  title?: string;
  subtitle?: string;
  details: readonly AnchorFlowReviewDetail[];
  steps: readonly string[];
};

export function AnchorFlowReviewStep({
  title = "Review",
  subtitle = "Confirm the details below before submitting.",
  details,
  steps,
}: AnchorFlowReviewStepProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className={DEPOSIT_SECTION_LABEL_CLASS}>{title}</p>
        <p className="px-0.5 text-[11px] leading-snug text-[#1E4775]/55">
          {subtitle}
        </p>
      </div>

      <div className="space-y-1.5 rounded-xl border border-[#1E4775]/12 bg-white/80 px-3 py-2.5">
        {details.map((row) => (
          <div
            key={`${row.label}-${row.value}`}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-[#1E4775]/55">{row.label}</p>
              {row.hint ? (
                <p className="text-[10px] leading-snug text-[#1E4775]/40">
                  {row.hint}
                </p>
              ) : null}
            </div>
            <p
              className="max-w-[58%] shrink-0 text-right text-xs font-semibold tabular-nums text-[#1E4775]"
              title={row.valueTitle}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>

      {steps.length >= 2 ? (
        <div className="space-y-1.5">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Transaction steps</p>
          <ol className="space-y-1.5 rounded-xl border border-[#1E4775]/12 bg-[#1E4775]/[0.04] px-3 py-2.5">
            {steps.map((step, index) => (
              <li
                key={`${index}-${step}`}
                className="flex items-start gap-2 text-xs text-[#1E4775]"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1E4775]/12 text-[10px] font-semibold tabular-nums text-[#1E4775]/80">
                  {index + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
