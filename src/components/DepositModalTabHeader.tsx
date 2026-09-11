"use client";

import React from "react";
import { HARBOR_FROSTED_ACTIVE_PILL } from "@/components/shared/harborFrostedSurfaceStyles";

export interface DepositModalTabHeaderProps {
  /** Tab labels and values */
  tabs: Array<{ value: string; label: string; subtitle?: string }>;
  /** Currently active tab value */
  activeTab: string;
  onTabChange: (value: string) => void;
  disabled?: boolean;
  /** Per-tab disable (e.g. Genesis: deposit when ended, withdraw when no balance) */
  tabDisabled?: Partial<Record<string, boolean>>;
}

/**
 * Tab header for Sail/Anchor modals (Mint|Redeem or Deposit|Withdraw).
 */
export function DepositModalTabHeader({
  tabs,
  activeTab,
  onTabChange,
  disabled = false,
  tabDisabled,
}: DepositModalTabHeaderProps) {
  return (
    <div className="flex w-full gap-1 rounded-md bg-[#1E4775] p-0.5">
      {tabs.map(({ value, label, subtitle }) => {
        const active = activeTab === value;
        return (
          <button
            key={value}
            onClick={() => onTabChange(value)}
            disabled={disabled || tabDisabled?.[value]}
            className={`flex flex-1 flex-col items-center justify-center rounded-md py-1.5 sm:py-2 transition-colors touch-target ${
              active
                ? HARBOR_FROSTED_ACTIVE_PILL
                : "text-white hover:bg-white/20"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="text-xs font-medium sm:text-sm">{label}</span>
            {subtitle ? (
              <span
                className={`text-[9px] font-normal leading-tight sm:text-[10px] ${
                  active ? "text-[#1E4775]/55" : "text-white/55"
                }`}
              >
                {subtitle}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
