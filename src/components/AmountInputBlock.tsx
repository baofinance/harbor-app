import React from "react";

interface AmountInputBlockProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMax?: () => void;
  disabled?: boolean;
  error?: string | null;
  /** When true, show error border (e.g. exceeds balance) without error message */
  exceedsBalance?: boolean;
  label?: string;
  balanceContent?: React.ReactNode;
  inputClassName?: string;
  maxButtonClassName?: string;
  /** Optional overlay inside the amount input (e.g. tempMaxWarning). Renders between input and MAX button. */
  overlay?: React.ReactNode;
}

export const AmountInputBlock = ({
  value,
  onChange,
  onMax,
  disabled = false,
  error,
  exceedsBalance = false,
  label = "Amount",
  balanceContent,
  inputClassName,
  maxButtonClassName,
  overlay,
}: AmountInputBlockProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2 text-xs sm:items-center sm:text-sm">
        <span className="font-semibold text-[#1E4775]">{label}</span>
        {balanceContent && (
          <span className="text-right text-[#1E4775]/70 break-words">
            {balanceContent}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="0.0"
          className={
            inputClassName ||
            `w-full rounded-md px-3 pr-20 py-2 bg-white text-[#1E4775] border ${
              error || exceedsBalance ? "border-red-500" : "border-[#1E4775]/30"
            } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`
          }
          disabled={disabled}
        />
        {overlay}
        {onMax && (
          <button
            onClick={onMax}
            className={
              maxButtonClassName ||
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 font-medium"
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
