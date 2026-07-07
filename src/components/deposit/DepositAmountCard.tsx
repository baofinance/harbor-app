"use client";

import type { ReactNode } from "react";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import { CustomTokenAddressInput } from "@/components/CustomTokenAddressInput";
import { useAmountInput } from "@/hooks/useAmountInput";
import { formatBalance } from "@/utils/formatters";
import type {
  AmountConfig,
  CustomTokenConfig,
  TokenSelectorConfig,
} from "@/components/TokenAmountSection";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type DepositAmountCardProps = {
  tokenSelector?: TokenSelectorConfig;
  customToken?: CustomTokenConfig;
  amount: AmountConfig;
  /** Show token selector row (default true when tokenSelector provided). */
  showTokenSelector?: boolean;
  tokenRowLabel?: string;
  betweenTokenAndAmount?: ReactNode;
  afterAmount?: ReactNode;
  disabled?: boolean;
};

export function DepositAmountCard({
  tokenSelector,
  customToken,
  amount,
  showTokenSelector = true,
  tokenRowLabel = "Pay with",
  betweenTokenAndAmount,
  afterAmount,
  disabled = false,
}: DepositAmountCardProps) {
  const {
    value,
    setValue,
    balance,
    decimals,
    error,
    isNativeETH = false,
    capAtBalance = true,
    onErrorClear,
    balanceSymbol = "",
    balanceMaxDecimals = 4,
    balanceContent: balanceContentOverride,
    amountInputOverlay,
    inputClassName,
    customHandleMax,
    customHandleChange,
    onChangeExtra,
  } = amount;

  const { handleChange: baseHandleChange, handleMax: defaultHandleMax, exceedsBalance } =
    useAmountInput(value, setValue, {
      decimals,
      balance,
      capAtBalance,
      isNativeETH,
      onErrorClear,
    });

  const handleMax = customHandleMax ?? defaultHandleMax;
  const handleChange =
    customHandleChange ??
    (onChangeExtra
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          onChangeExtra();
          baseHandleChange(e);
        }
      : baseHandleChange);

  const balanceContent =
    balanceContentOverride ??
    (balanceSymbol ? (
      <span className="text-[11px] tabular-nums text-[#1E4775]/60">
        Balance:{" "}
        {formatBalance(balance ?? 0n, balanceSymbol, balanceMaxDecimals, decimals)}
      </span>
    ) : null);

  const inputDisabled = disabled || amount.disabled;
  const showTokenRow = showTokenSelector && tokenSelector;

  const defaultInputClass = `w-full rounded-lg border bg-white/90 px-3 pr-20 py-3 font-mono text-2xl text-[#1E4775] transition-all focus:border-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 ${
    error || exceedsBalance ? "border-red-500" : "border-[#1E4775]/20"
  }`;

  return (
    <div className={DEPOSIT_AMOUNT_CARD_CLASS}>
      {showTokenRow ? (
        <div className="mb-3 space-y-2">
          <span className={DEPOSIT_SECTION_LABEL_CLASS}>{tokenRowLabel}</span>
          <TokenSelectorDropdown
            value={tokenSelector.value}
            onChange={tokenSelector.onChange}
            options={tokenSelector.options}
            disabled={tokenSelector.disabled || inputDisabled}
            placeholder={tokenSelector.placeholder ?? "Select token"}
            showCustomOption={tokenSelector.showCustomOption}
            onCustomOptionClick={tokenSelector.onCustomOptionClick}
            customOptionLabel={tokenSelector.customOptionLabel}
          />
          {customToken?.show ? (
            <CustomTokenAddressInput
              value={customToken.value}
              onChange={customToken.onChange}
              disabled={customToken.disabled || inputDisabled}
              validTokenInfo={customToken.validTokenInfo}
            />
          ) : null}
        </div>
      ) : null}

      {balanceContent ? (
        <div className="mb-2 flex items-center justify-end">{balanceContent}</div>
      ) : null}

      {betweenTokenAndAmount ? (
        <div className="mb-2 text-xs text-[#1E4775]/70">{betweenTokenAndAmount}</div>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="0.0"
          disabled={inputDisabled}
          className={inputClassName ?? defaultInputClass}
        />
        {amountInputOverlay}
        <button
          type="button"
          onClick={handleMax}
          disabled={inputDisabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-harbor-coral px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#FF6B5A] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          MAX
        </button>
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}

      {afterAmount ? (
        <div className="mt-3 space-y-2 border-t border-[#1E4775]/8 pt-3">{afterAmount}</div>
      ) : null}
    </div>
  );
}
