"use client";

import React from "react";

export interface TabConfig {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ModalTabsProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose: () => void;
}

/**
 * Tab navigation + close button. Matches Genesis/Anchor/Sail styling.
 */
export function ModalTabs({
  tabs,
  activeTab,
  onTabChange,
  onClose,
}: ModalTabsProps) {
  return (
    <div className="flex items-center justify-between p-0 pt-2 sm:pt-3 px-2 sm:px-3 border-b border-[#1E4775]/10">
      <div className="flex flex-1 mr-2 sm:mr-4 border border-[#1E4775]/20 border-b-0 overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors touch-target ${
              activeTab === tab.id
                ? "bg-[#1E4775] text-white"
                : "bg-[#eef1f7] text-[#4b5a78]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors flex-shrink-0 touch-target flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7"
        aria-label="Close modal"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
