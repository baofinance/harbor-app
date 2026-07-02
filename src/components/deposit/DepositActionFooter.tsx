"use client";

import type { ReactNode } from "react";
import type { DepositPrimaryAction } from "@/utils/depositFormState";
import { DepositPrimaryButton } from "@/components/deposit/DepositPrimaryButton";
import { DEPOSIT_CANCEL_BUTTON_CLASS } from "@/components/deposit/depositFlowStyles";

type DepositActionFooterProps = {
  layout?: "embedded" | "modal";
  feeFooter?: ReactNode;
  action: DepositPrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
};

export function DepositActionFooter({
  layout = "modal",
  feeFooter,
  action,
  onSubmit,
  onRetry,
  onCancel,
  showCancel = false,
}: DepositActionFooterProps) {
  return (
    <div className="mt-auto shrink-0 space-y-2.5 border-t border-[#1E4775]/8 pt-3">
      {feeFooter}
      <div className={layout === "modal" ? "flex gap-3" : undefined}>
        {showCancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={DEPOSIT_CANCEL_BUTTON_CLASS}
          >
            Cancel
          </button>
        ) : null}
        <div className={layout === "modal" ? "min-w-0 flex-1" : undefined}>
          <DepositPrimaryButton
            action={action}
            onSubmit={onSubmit}
            onRetry={onRetry}
            className={layout === "modal" ? "w-full" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
