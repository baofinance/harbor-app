import React from "react";

interface AmountInputBlockProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMax?: () => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  balanceContent?: React.ReactNode;
  inputClassName?: string;
  maxButtonClassName?: string;
}

export const AmountInputBlock = ({
  value,
  onChange,
  onMax,
  disabled = false,
  error,
  label = "Amount",
  balanceContent,
  inputClassName,
  maxButtonClassName,
}: AmountInputBlockProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[#1E4775]/70">{label}</span>
        {balanceContent && <span className="text-[#1E4775]/70">{balanceContent}</span>}
      </div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="0.0"
          className={
            inputClassName ||
            `w-full px-3 pr-20 py-2 bg-white text-[#1E4775] border ${
              error ? "border-red-500" : "border-[#1E4775]/30"
            } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`
          }
          disabled={disabled}
        />
        {onMax && (
          <button
            onClick={onMax}
            className={
              maxButtonClassName ||
              "absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
            }
            disabled={disabled}
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
};
