"use client";

import type { DepositPrimaryAction } from "@/utils/depositFormState";
import { DepositPrimaryButton } from "@/components/deposit/DepositPrimaryButton";

type SailTradePrimaryButtonProps = {
  action: DepositPrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  className?: string;
};

export function SailTradePrimaryButton(props: SailTradePrimaryButtonProps) {
  return <DepositPrimaryButton {...props} />;
}
