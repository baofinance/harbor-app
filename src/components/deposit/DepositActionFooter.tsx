"use client";

import type { ReactNode } from "react";
import type { DepositPrimaryAction } from "@/utils/depositFormState";
import { DepositPrimaryButton } from "@/components/deposit/DepositPrimaryButton";
import { DEPOSIT_CANCEL_BUTTON_CLASS, ANCHOR_MODAL_FOOTER_CHROME } from "@/components/deposit/depositFlowStyles";

type DepositActionFooterProps = {
  layout?: "embedded" | "modal";
  feeFooter?: ReactNode;
  /** Quiet line under the primary CTA (e.g. review wallet prompts). */
  actionHint?: string;
  action: DepositPrimaryAction;
  onSubmit: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  cancelLabel?: string;
};

export function DepositActionFooter({
  layout = "modal",
  feeFooter,
  actionHint,
  action,
  onSubmit,
  onRetry,
  onCancel,
  showCancel = false,
  cancelLabel = "Cancel",
}: DepositActionFooterProps) {
  return (
    <div className={ANCHOR_MODAL_FOOTER_CHROME}>
      {feeFooter}
      <div className={layout === "modal" ? "flex gap-3" : "w-full"}>
        {showCancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={DEPOSIT_CANCEL_BUTTON_CLASS}
          >
            {cancelLabel}
          </button>
        ) : null}
        <div className={layout === "modal" ? "min-w-0 flex-1" : "w-full"}>
          <DepositPrimaryButton
            action={action}
            onSubmit={onSubmit}
            onRetry={onRetry}
            className="w-full"
          />
          {actionHint ? (
            <p className="mt-1.5 text-center text-[10px] leading-snug text-[#1E4775]/45">
              {actionHint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
