"use client";

import React from "react";

export interface CustomTokenAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** When valid token found, show success message e.g. "Name (SYMBOL)" */
  validTokenInfo?: string | null;
  className?: string;
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function CustomTokenAddressInput({
  value,
  onChange,
  disabled = false,
  validTokenInfo,
  className = "",
}: CustomTokenAddressInputProps) {
  const isInvalid =
    value.length > 0 && (value.length < 42 || !ADDRESS_REGEX.test(value));

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="0x..."
        className="w-full h-10 px-3 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-sm font-mono"
        disabled={disabled}
      />
      {isInvalid && (
        <div className="text-xs text-red-600">
          Invalid address format. Must start with 0x and be 42 characters.
        </div>
      )}
      {validTokenInfo && (
        <div className="text-xs text-green-600">
          ✓ Token found: {validTokenInfo}
        </div>
      )}
    </div>
  );
}
