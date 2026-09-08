"use client";

import { formatEther } from "viem";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type {
  AnchorRedeemPosition,
  AnchorRedeemStepActionKind,
} from "@/utils/anchorRedeemPositions";
import { redeemPositionTitle } from "@/utils/anchorRedeemPositions";

function formatHaBalance(balance: bigint): string {
  const n = Number(formatEther(balance));
  if (!Number.isFinite(n)) return "0";
  if (n > 0 && n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export type AnchorRedeemPositionStepProps = {
  position: AnchorRedeemPosition;
  peggedTokenSymbol: string;
  receiveSymbol?: string;
  /** When true, show amount field (wallet or immediate pool withdraw). */
  showAmount: boolean;
  amount: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  disabled?: boolean;
  actionKind: AnchorRedeemStepActionKind;
  /** Show quiet early-withdraw affordance (pool, window not open). */
  showEarlyWithdrawLink?: boolean;
  earlyWithdrawEnabled?: boolean;
  onEnableEarlyWithdraw?: () => void;
  onChangePosition: () => void;
  helperText?: string;
};

export function AnchorRedeemPositionStep({
  position,
  peggedTokenSymbol,
  receiveSymbol,
  showAmount,
  amount,
  onAmountChange,
  onMax,
  disabled = false,
  actionKind,
  showEarlyWithdrawLink = false,
  earlyWithdrawEnabled = false,
  onEnableEarlyWithdraw,
  onChangePosition,
  helperText,
}: AnchorRedeemPositionStepProps) {
  const title = redeemPositionTitle(position, peggedTokenSymbol);

  return (
    <div className="space-y-2">
      <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} flex items-start gap-3`}>
        <div className="min-w-0 flex-1">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Selected</p>
          <p className="text-sm font-semibold text-[#1E4775]">{title}</p>
          <p className="mt-1 font-mono text-xs tabular-nums text-[#1E4775]/75">
            {formatHaBalance(position.balance)} {peggedTokenSymbol}
          </p>
        </div>
        <button
          type="button"
          onClick={onChangePosition}
          disabled={disabled}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-[#1E4775]/70 transition hover:bg-[#1E4775]/5 hover:text-[#1E4775] disabled:opacity-50"
        >
          Change
        </button>
      </div>

      {showAmount ? (
        <DepositAmountCard
          showTokenSelector={false}
          amountSectionLabel={
            actionKind === "redeem" ? "Redeem amount" : "Withdraw amount"
          }
          amount={{
            value: amount,
            setValue: onAmountChange,
            onErrorClear: () => {},
            balance: position.balance,
            decimals: 18,
            balanceSymbol: peggedTokenSymbol,
            customHandleMax: onMax,
            disabled,
          }}
        />
      ) : (
        <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} space-y-1.5`}>
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Withdrawal</p>
          <p className="text-sm font-semibold text-[#1E4775]">
            Request full position
          </p>
          <p className="text-xs leading-snug text-[#1E4775]/65">
            {helperText ??
              "Starts the exit from this Earn pool. Come back when the withdrawal window opens to finish and redeem to collateral."}
          </p>
        </div>
      )}

      {receiveSymbol && actionKind !== "request" ? (
        <p className="px-0.5 text-[11px] leading-snug text-[#1E4775]/55">
          You&apos;ll receive {receiveSymbol}
          {actionKind === "withdrawAndRedeem"
            ? " after withdraw and redeem"
            : ""}
          .
        </p>
      ) : null}

      {showEarlyWithdrawLink && !earlyWithdrawEnabled && onEnableEarlyWithdraw ? (
        <button
          type="button"
          onClick={onEnableEarlyWithdraw}
          disabled={disabled}
          className="w-full text-left text-[11px] font-medium text-[#1E4775]/55 underline-offset-2 transition hover:text-[#1E4775] hover:underline disabled:opacity-50"
        >
          Need it sooner? Withdraw now with a 1% fee
        </button>
      ) : null}

      {showEarlyWithdrawLink && earlyWithdrawEnabled ? (
        <p className="text-[11px] font-medium text-[#b45309]">
          Early withdraw enabled (1% fee). Enter an amount above, then confirm.
        </p>
      ) : null}
    </div>
  );
}
