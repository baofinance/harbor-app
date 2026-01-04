"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import TokenIconClient from "@/components/TokenIconClient";

interface TokenOption {
  symbol: string;
  name: string;
  feePercentage?: number;
  isUserToken?: boolean;
  description?: string; // Custom description text (e.g., APR info)
}

interface TokenGroup {
  label: string;
  tokens: TokenOption[];
}

interface TokenSelectorDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: TokenOption[] | TokenGroup[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showCustomOption?: boolean;
  onCustomOptionClick?: () => void;
  customOptionLabel?: string;
}

export function TokenSelectorDropdown({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select Token",
  className = "",
  showCustomOption = false,
  onCustomOptionClick,
  customOptionLabel = "+ Add Custom Token Address",
}: TokenSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Normalize options to groups format
  const groups: TokenGroup[] = Array.isArray(options) && options.length > 0
    ? (options[0] as TokenGroup).label !== undefined
      ? (options as TokenGroup[])
      : [
          {
            label: "Tokens",
            tokens: options as TokenOption[],
          },
        ]
    : [];

  const selectedToken = groups
    .flatMap((g) => g.tokens)
    .find((t) => t.symbol === value);

  const getDisplayText = (token: TokenOption) => {
    let text = `${token.name} (${token.symbol})`;
    if (token.feePercentage !== undefined) {
      text += ` - ${token.feePercentage.toFixed(2)}% estimated fee`;
    } else if (token.isUserToken) {
      text += " - Will be swapped";
    } else {
      text += " - Fee: -";
    }
    return text;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-white text-[#1E4775] border border-[#1E4775]/20 focus:border-[#1E4775]/40 focus:ring-1 focus:ring-[#1E4775]/20 focus:outline-none text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1E4775]/5"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedToken ? (
            <>
              <TokenIconClient
                symbol={selectedToken.symbol}
                size={20}
                variant="branded"
                className="flex-shrink-0 rounded-full"
              />
              <span className="font-medium truncate">
                {selectedToken.name} ({selectedToken.symbol})
              </span>
            </>
          ) : (
            <span className="text-[#1E4775]/60">{placeholder}</span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-[#1E4775]/60 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-[#1E4775]/20 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {groups.length > 1 && (
                <div className="px-4 py-2 bg-[#1E4775]/5 text-xs font-semibold text-[#1E4775]/70 uppercase tracking-wider sticky top-0">
                  {group.label}
                </div>
              )}
              {group.tokens.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => {
                    onChange(token.symbol);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-[#1E4775]/5 transition-colors text-left ${
                    value === token.symbol ? "bg-[#1E4775]/10" : ""
                  }`}
                >
                  <TokenIconClient
                    symbol={token.symbol}
                    size={20}
                    variant="branded"
                    className="flex-shrink-0 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1E4775] font-medium">
                      {token.name} ({token.symbol})
                    </div>
                    <div className="text-xs text-[#1E4775]/60 truncate">
                      {token.description
                        ? token.description
                        : token.feePercentage !== undefined
                        ? `${token.feePercentage.toFixed(2)}% estimated fee`
                        : token.isUserToken
                        ? "Will be swapped"
                        : "Fee: -"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {showCustomOption && (
            <div className="border-t border-[#1E4775]/10">
              <button
                type="button"
                onClick={() => {
                  if (onCustomOptionClick) {
                    onCustomOptionClick();
                  } else {
                    onChange("custom");
                  }
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#1E4775]/5 transition-colors text-left text-[#1E4775] font-medium"
              >
                <span className="text-lg">+</span>
                <span>{customOptionLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
