"use client";

import type { SailTradePrimaryAction } from "@/utils/sailTradeFormState";
import {
  isSailTradePrimaryActionDisabled,
  sailTradePrimaryActionLabel,
} from "@/utils/sailTradeFormState";
import { HarborConnectWalletCta } from "@/components/sail/HarborConnectWalletCta";
import {
  SAIL_TRADE_PRIMARY_BUY_CLASS,
  SAIL_TRADE_PRIMARY_DISABLED_CLASS,
  SAIL_TRADE_PRIMARY_RETRY_CLASS,
  SAIL_TRADE_PRIMARY_SELL_CLASS,
} from "@/components/sail/advanced/sailAdvancedStyles";

type SailTradePrimaryButtonProps = {
  action: SailTradePrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  className?: string;
};

export function SailTradePrimaryButton({
  action,
  onSubmit,
  onRetry,
  className,
}: SailTradePrimaryButtonProps) {
  if (action.kind === "connect") {
    return (
      <HarborConnectWalletCta
        className={className ?? SAIL_TRADE_PRIMARY_BUY_CLASS}
        label={sailTradePrimaryActionLabel(action)}
      />
    );
  }

  const label = sailTradePrimaryActionLabel(action);
  const disabled = isSailTradePrimaryActionDisabled(action);

  let buttonClass = SAIL_TRADE_PRIMARY_DISABLED_CLASS;
  if (action.kind === "submit") {
    buttonClass =
      action.label === "Buy"
        ? SAIL_TRADE_PRIMARY_BUY_CLASS
        : SAIL_TRADE_PRIMARY_SELL_CLASS;
  } else if (action.kind === "retry") {
    buttonClass = SAIL_TRADE_PRIMARY_RETRY_CLASS;
  }

  return (
    <button
      type="button"
      onClick={action.kind === "retry" ? onRetry : onSubmit}
      disabled={disabled}
      className={className ?? buttonClass}
    >
      {label}
    </button>
  );
}
