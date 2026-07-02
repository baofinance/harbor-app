"use client";

import type { DepositPrimaryAction } from "@/utils/depositFormState";
import {
  depositPrimaryActionLabel,
  depositPrimaryActionVariant,
  isDepositPrimaryActionDisabled,
} from "@/utils/depositFormState";
import { HarborConnectWalletCta } from "@/components/sail/HarborConnectWalletCta";
import {
  DEPOSIT_PRIMARY_DISABLED_CLASS,
  DEPOSIT_PRIMARY_MINT_CLASS,
  DEPOSIT_PRIMARY_NAVY_CLASS,
  DEPOSIT_PRIMARY_RETRY_CLASS,
} from "@/components/deposit/depositFlowStyles";
import { cn } from "@/lib/utils";

type DepositPrimaryButtonProps = {
  action: DepositPrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  className?: string;
};

export function DepositPrimaryButton({
  action,
  onSubmit,
  onRetry,
  className,
}: DepositPrimaryButtonProps) {
  if (action.kind === "connect") {
    return (
      <HarborConnectWalletCta
        className={cn(DEPOSIT_PRIMARY_MINT_CLASS, className)}
        label={depositPrimaryActionLabel(action)}
      />
    );
  }

  const label = depositPrimaryActionLabel(action);
  const disabled = isDepositPrimaryActionDisabled(action);

  let buttonClass = DEPOSIT_PRIMARY_DISABLED_CLASS;
  if (action.kind === "submit") {
    buttonClass =
      depositPrimaryActionVariant(action) === "navy"
        ? DEPOSIT_PRIMARY_NAVY_CLASS
        : DEPOSIT_PRIMARY_MINT_CLASS;
  } else if (action.kind === "retry") {
    buttonClass = DEPOSIT_PRIMARY_RETRY_CLASS;
  }

  return (
    <button
      type="button"
      onClick={action.kind === "retry" ? onRetry : onSubmit}
      disabled={disabled}
      className={cn(buttonClass, className)}
    >
      {label}
    </button>
  );
}
