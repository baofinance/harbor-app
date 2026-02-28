"use client";

import React from "react";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import { CustomTokenAddressInput } from "@/components/CustomTokenAddressInput";
import { AmountInputBlock } from "@/components/AmountInputBlock";
import { useAmountInput } from "@/hooks/useAmountInput";
import { formatBalance } from "@/utils/formatters";

export interface TokenSelectorConfig {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; tokens: Array<{ symbol: string; name: string; isUserToken?: boolean; feePercentage?: number; description?: string }> }>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showCustomOption?: boolean;
  onCustomOptionClick?: () => void;
  customOptionLabel?: string;
}

export interface CustomTokenConfig {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  disabled?: boolean;
  validTokenInfo?: string | null;
}

export interface AmountConfig {
  value: string;
  setValue: (value: string) => void;
  balance: bigint | undefined;
  decimals: number;
  label?: string;
  disabled?: boolean;
  error?: string | null;
  isNativeETH?: boolean;
  capAtBalance?: boolean;
  onErrorClear?: () => void;
  balanceSymbol?: string;
  balanceMaxDecimals?: number;
  /** Override default balance display (e.g. for loading/error states) */
  balanceContent?: React.ReactNode;
  /** Overlay inside amount input (e.g. tempMaxWarning). Renders between input and MAX button. */
  amountInputOverlay?: React.ReactNode;
  /** Custom input styling (e.g. h-14, text-xl for Anchor) */
  inputClassName?: string;
  /** Custom MAX button logic. When provided, overrides default useAmountInput handleMax. */
  customHandleMax?: () => void;
  /** Custom change handler. When provided, overrides useAmountInput (for modals with complex balance/decimals logic). */
  customHandleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called at the start of onChange (e.g. to clear tempMaxWarning when user types). Ignored when customHandleChange is used. */
  onChangeExtra?: () => void;
}

export interface TokenAmountSectionProps {
  tokenSelector?: TokenSelectorConfig;
  customToken?: CustomTokenConfig;
  amount: AmountConfig;
  /** Slot between token selector and amount (e.g. swap info, fee display, ModalNotificationsPanel) */
  betweenTokenAndAmount?: React.ReactNode;
  /** Slot after amount (e.g. permit toggle, mint-only checkbox) */
  afterAmount?: React.ReactNode;
  className?: string;
}

export function TokenAmountSection({
  tokenSelector,
  customToken,
  amount,
  betweenTokenAndAmount,
  afterAmount,
  className = "",
}: TokenAmountSectionProps) {
  const {
    value,
    setValue,
    balance,
    decimals,
    label = "Enter Amount",
    disabled = false,
    error,
    isNativeETH = false,
    capAtBalance = true,
    onErrorClear,
    balanceSymbol = "",
    balanceMaxDecimals = 4,
    balanceContent: balanceContentOverride,
    amountInputOverlay,
    inputClassName: inputClassNameOverride,
    customHandleMax,
    customHandleChange,
    onChangeExtra,
  } = amount;

  const { handleChange: baseHandleChange, handleMax: defaultHandleMax, exceedsBalance } = useAmountInput(
    value,
    setValue,
    {
      decimals,
      balance,
      capAtBalance,
      isNativeETH,
      onErrorClear,
    }
  );

  const handleMax = customHandleMax ?? defaultHandleMax;

  const handleChange = customHandleChange
    ? customHandleChange
    : onChangeExtra
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          onChangeExtra();
          baseHandleChange(e);
        }
      : baseHandleChange;

  const balanceContent =
    balanceContentOverride ??
    (balanceSymbol ? (
      <>
        Balance:{" "}
        {formatBalance(balance ?? 0n, balanceSymbol, balanceMaxDecimals, decimals)}
      </>
    ) : null);

  return (
    <div className={`space-y-3 ${className}`}>
      {tokenSelector && (
        <div className="space-y-2">
          {tokenSelector.label && (
            <label className="text-sm font-semibold text-[#1E4775]">
              {tokenSelector.label}
            </label>
          )}
          <TokenSelectorDropdown
            value={tokenSelector.value}
            onChange={tokenSelector.onChange}
            options={tokenSelector.options}
            disabled={tokenSelector.disabled}
            placeholder={tokenSelector.placeholder ?? "Select Deposit Token"}
            showCustomOption={tokenSelector.showCustomOption}
            onCustomOptionClick={tokenSelector.onCustomOptionClick}
            customOptionLabel={tokenSelector.customOptionLabel}
          />
          {customToken?.show && (
            <CustomTokenAddressInput
              value={customToken.value}
              onChange={customToken.onChange}
              disabled={customToken.disabled}
              validTokenInfo={customToken.validTokenInfo}
            />
          )}
        </div>
      )}
      {betweenTokenAndAmount}
      <AmountInputBlock
        value={value}
        onChange={handleChange}
        onMax={handleMax}
        disabled={disabled}
        error={error}
        exceedsBalance={exceedsBalance}
        label={label}
        balanceContent={balanceContent}
        inputClassName={inputClassNameOverride}
        overlay={amountInputOverlay}
      />
      {afterAmount}
    </div>
  );
}
