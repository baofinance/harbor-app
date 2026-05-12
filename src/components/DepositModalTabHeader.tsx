"use client";

import React from "react";

export interface DepositModalTabHeaderProps {
  /** Tab labels and values */
  tabs: Array<{ value: string; label: string }>;
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
    <div className="flex flex-1 mr-2 sm:mr-4 overflow-hidden rounded-t-md border border-[#1E4775]/20 border-b-0">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onTabChange(value)}
          disabled={disabled || tabDisabled?.[value]}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-colors touch-target ${
            activeTab === value
              ? "bg-[#153B63] text-white"
              : "bg-[#eef2f7] text-[#153B63]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
