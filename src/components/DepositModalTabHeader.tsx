"use client";

import React from "react";

export interface DepositModalTabHeaderProps {
  /** Tab labels and values */
  tabs: Array<{ value: string; label: string }>;
  /** Currently active tab value */
  activeTab: string;
  onTabChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Tab header for Sail/Anchor modals (Mint|Redeem or Deposit|Withdraw).
 */
export function DepositModalTabHeader({
  tabs,
  activeTab,
  onTabChange,
  disabled = false,
}: DepositModalTabHeaderProps) {
  return (
    <div className="flex flex-1 mr-2 sm:mr-4 border border-[#1E4775]/20 border-b-0 overflow-hidden">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onTabChange(value)}
          disabled={disabled}
          className={`flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors touch-target ${
            activeTab === value
              ? "bg-[#1E4775] text-white"
              : "bg-[#eef1f7] text-[#4b5a78]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
