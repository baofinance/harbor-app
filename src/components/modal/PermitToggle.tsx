"use client";

import React from "react";

interface PermitToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const DEFAULT_LABEL = "Use permit (gasless approval) for this deposit";

/**
 * Permit toggle row. Matches Anchor/Sail styling (text-xs, small switch).
 */
export function PermitToggle({
  enabled,
  onChange,
  disabled = false,
  label = DEFAULT_LABEL,
}: PermitToggleProps) {
  return (
    <div className="flex items-center justify-between border border-[#1E4775]/20 bg-[#17395F]/5 px-3 py-2 text-xs">
      <div className="text-[#1E4775]/80">{label}</div>
      <label className="flex items-center gap-2 text-[#1E4775]/80 cursor-pointer">
        <span className={enabled ? "text-[#1E4775]" : "text-[#1E4775]/60"}>
          {enabled ? "On" : "Off"}
        </span>
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? "bg-[#1E4775]" : "bg-[#1E4775]/30"
          }`}
          aria-pressed={enabled}
          aria-label="Toggle permit usage"
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
