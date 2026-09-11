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
  DEPOSIT_AMOUNT_MAX_BUTTON_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
  depositAmountInputClass,
} from "@/components/deposit/depositFlowStyles";
import { DepositBalanceStrip } from "@/components/deposit/DepositBalanceStrip";

export type DepositAmountCardProps = {
  tokenSelector?: TokenSelectorConfig;
  customToken?: CustomTokenConfig;
  amount: AmountConfig;
  /** Show token selector row (default true when tokenSelector provided). */
  showTokenSelector?: boolean;
  tokenRowLabel?: string;
  /** Label above the amount field (e.g. Sell amount). */
  amountSectionLabel?: string;
  betweenTokenAndAmount?: ReactNode;
  afterAmount?: ReactNode;
  disabled?: boolean;
};

export function DepositAmountCard({
  tokenSelector,
  customToken,
  amount,
  showTokenSelector = true,
  tokenRowLabel,
  amountSectionLabel,
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

  const formattedBalance = balanceSymbol
    ? formatBalance(balance ?? 0n, balanceSymbol, balanceMaxDecimals, decimals)
    : null;

  const inputDisabled = disabled || amount.disabled;
  const showTokenRow = showTokenSelector && tokenSelector;

  const defaultInputClass = depositAmountInputClass(
    !!(error || exceedsBalance),
  );

  return (
    <div className={DEPOSIT_AMOUNT_CARD_CLASS}>
      {showTokenRow ? (
        <div className={`${tokenRowLabel ? "space-y-2" : ""} mb-3`}>
          {tokenRowLabel ? (
            <span className={DEPOSIT_SECTION_LABEL_CLASS}>{tokenRowLabel}</span>
          ) : null}
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

      {balanceContentOverride ? (
        <div className="mb-2 flex items-center justify-end">{balanceContentOverride}</div>
      ) : null}

      {betweenTokenAndAmount ? (
        <div className="mb-2 text-xs text-[#1E4775]/70">{betweenTokenAndAmount}</div>
      ) : null}

      {amountSectionLabel ? (
        <span className={`${DEPOSIT_SECTION_LABEL_CLASS} mb-1.5 block`}>
          {amountSectionLabel}
        </span>
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
          className={DEPOSIT_AMOUNT_MAX_BUTTON_CLASS}
        >
          MAX
        </button>
      </div>

      {!balanceContentOverride && formattedBalance ? (
        <DepositBalanceStrip
          className="mt-1"
          ariaLabel={`Balance ${balanceSymbol}`}
        >
          {formattedBalance}
        </DepositBalanceStrip>
      ) : null}

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}

      {afterAmount ? (
        <div className="mt-3 space-y-2 border-t border-[#1E4775]/8 pt-3">{afterAmount}</div>
      ) : null}
    </div>
  );
}
