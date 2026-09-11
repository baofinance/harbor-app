"use client";

import SimpleTooltip from "@/components/SimpleTooltip";

export type DepositPermitToggleMode = "deposit" | "redemption";

type DepositPermitToggleProps = {
  mode: DepositPermitToggleMode;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disableReason?: string | null;
};

const LABEL_BY_MODE: Record<DepositPermitToggleMode, string> = {
  deposit: "Use permit (gasless approval) for this deposit",
  redemption: "Use permit (gasless approval) for this sell",
};

/** Shared gasless-approval toggle for Anchor, Sail, and Genesis trade modals. */
export function DepositPermitToggle({
  mode,
  enabled,
  onToggle,
  disabled = false,
  disableReason,
}: DepositPermitToggleProps) {
  const label = LABEL_BY_MODE[mode];

  if (disableReason) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs text-[#1E4775]/70">
        <span>{label}</span>
        <SimpleTooltip label={disableReason}>
          <span className="flex cursor-not-allowed items-center gap-2 text-[#1E4775]/80 opacity-70">
            <span className="text-[#1E4775]/60">Off</span>
            <button
              type="button"
              disabled
              className="relative inline-flex h-5 w-9 cursor-not-allowed items-center rounded-full bg-[#1E4775]/30"
              aria-label="Permit disabled"
            >
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white" />
            </button>
          </span>
        </SimpleTooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-[#1E4775]/70">
      <span>{label}</span>
      <label className="flex cursor-pointer items-center">
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? "bg-[#1E4775]" : "bg-[#1E4775]/30"
          }`}
          aria-pressed={enabled}
          aria-label="Toggle permit usage"
          disabled={disabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      </label>
    </div>
  );
}
