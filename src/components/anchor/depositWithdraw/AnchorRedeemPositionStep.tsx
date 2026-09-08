"use client";

import { Info } from "lucide-react";
import SimpleTooltip from "@/components/SimpleTooltip";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";
import {
  DEPOSIT_MODE_TOGGLE_ROW_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type {
  AnchorRedeemPosition,
  AnchorRedeemStepActionKind,
} from "@/utils/anchorRedeemPositions";
import { AnchorRedeemPositionRow } from "./AnchorRedeemPositionRow";

function RequestWithdrawalInfoBox({
  position,
  helperText,
  withdrawalDelayLabel,
  withdrawalDurationLabel,
}: {
  position: AnchorRedeemPosition;
  helperText?: string;
  withdrawalDelayLabel: string;
  withdrawalDurationLabel: string;
}) {
  const pendingLabel =
    position.kind === "pool" && position.requestStatus?.state === "pending"
      ? position.requestStatus.label
      : null;
  const openLabel =
    position.kind === "pool" &&
    (position.requestStatus?.state === "open" || position.windowOpen)
      ? (position.requestStatus?.label ?? "Ready now")
      : null;

  const title = pendingLabel
    ? "Withdrawal requested"
    : openLabel
      ? "Withdrawal window open"
      : "Request full position";

  const body =
    helperText ??
    (pendingLabel ? (
      <>
        Your exit is queued. The fee-free window{" "}
        <span className="font-semibold text-[#1E4775]">
          {pendingLabel.toLowerCase()}
        </span>
        , then stays open for{" "}
        <span className="font-semibold text-[#1E4775]">
          {withdrawalDurationLabel}
        </span>
        . Come back during that window to withdraw and redeem to collateral.
      </>
    ) : openLabel ? (
      <>
        Your fee-free window is open
        {openLabel !== "Ready now" ? (
          <>
            {" "}
            (
            <span className="font-semibold text-[#1E4775]">{openLabel}</span>)
          </>
        ) : null}
        . Withdraw and redeem to collateral before it closes.
      </>
    ) : (
      <>
        Starts the exit from this Earn pool. The fee-free window opens after{" "}
        <span className="font-semibold text-[#1E4775]">
          {withdrawalDelayLabel}
        </span>
        , then lasts{" "}
        <span className="font-semibold text-[#1E4775]">
          {withdrawalDurationLabel}
        </span>
        . Come back during that window to finish and redeem to collateral.
      </>
    ));

  return (
    <div
      className="rounded-xl border border-[#1E4775]/15 bg-[#1E4775]/[0.06] px-3 py-3"
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E4775]/10 text-[#1E4775]">
          <Info className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-[#1E4775]">{title}</p>
          <p className="text-xs leading-snug text-[#1E4775]/75">{body}</p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {pendingLabel ? (
              <span className="rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775] ring-1 ring-[#1E4775]/15">
                {pendingLabel}
              </span>
            ) : openLabel ? (
              <span className="rounded-md bg-[#4A9784]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#2f6f5f] ring-1 ring-[#4A9784]/25">
                {openLabel}
              </span>
            ) : (
              <>
                <span className="rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/80 ring-1 ring-[#1E4775]/10">
                  ~{withdrawalDelayLabel} delay
                </span>
                <span className="rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/80 ring-1 ring-[#1E4775]/10">
                  ~{withdrawalDurationLabel} window
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeToggleRow({
  label,
  tooltip,
  enabled,
  onToggle,
  disabled,
  ariaLabel,
}: {
  label: string;
  tooltip: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className={DEPOSIT_MODE_TOGGLE_ROW_CLASS}>
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="text-xs font-semibold text-[#1E4775]">{label}</p>
        <SimpleTooltip label={tooltip} side="top" maxWidth={240}>
          <span className="inline-flex h-4 w-4 cursor-help items-center justify-center text-[#1E4775]/50 hover:text-[#1E4775]">
            <Info className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">More info</span>
          </span>
        </SimpleTooltip>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          enabled ? "bg-[#1E4775]" : "bg-[#1E4775]/25"
        }`}
        aria-pressed={enabled}
        aria-label={ariaLabel}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export type AnchorRedeemPositionStepProps = {
  position: AnchorRedeemPosition;
  peggedTokenSymbol: string;
  /** When true, show amount field (wallet or immediate pool withdraw). */
  showAmount: boolean;
  amount: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  disabled?: boolean;
  actionKind: AnchorRedeemStepActionKind;
  /** Free vs fast withdrawal toggle (pool, window not open). */
  showEarlyWithdrawToggle?: boolean;
  earlyWithdrawEnabled?: boolean;
  onEnableEarlyWithdraw?: () => void;
  onDisableEarlyWithdraw?: () => void;
  /** Withdraw ha to wallet without redeeming to collateral. */
  showWithdrawOnlyToggle?: boolean;
  withdrawOnly?: boolean;
  onWithdrawOnlyChange?: (enabled: boolean) => void;
  onChangePosition: () => void;
  helperText?: string;
  /** From getWithdrawalWindow — shown in the request info box. */
  withdrawalDelayLabel?: string;
  withdrawalDurationLabel?: string;
};

export function AnchorRedeemPositionStep({
  position,
  peggedTokenSymbol,
  showAmount,
  amount,
  onAmountChange,
  onMax,
  disabled = false,
  actionKind,
  showEarlyWithdrawToggle = false,
  earlyWithdrawEnabled = false,
  onEnableEarlyWithdraw,
  onDisableEarlyWithdraw,
  showWithdrawOnlyToggle = false,
  withdrawOnly = false,
  onWithdrawOnlyChange,
  onChangePosition,
  helperText,
  withdrawalDelayLabel = "1 hour",
  withdrawalDurationLabel = "24 hours",
}: AnchorRedeemPositionStepProps) {
  const canToggleSpeed =
    showEarlyWithdrawToggle &&
    !!onEnableEarlyWithdraw &&
    !!onDisableEarlyWithdraw;

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Selected position</p>
          <button
            type="button"
            onClick={onChangePosition}
            disabled={disabled}
            className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#1E4775]/70 transition hover:bg-[#1E4775]/5 hover:text-[#1E4775] disabled:opacity-50"
          >
            Change
          </button>
        </div>
        <AnchorRedeemPositionRow
          position={position}
          peggedTokenSymbol={peggedTokenSymbol}
          selected
        />
      </div>

      {canToggleSpeed ? (
        <div className="space-y-1">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Speed</p>
          <ModeToggleRow
            label={
              earlyWithdrawEnabled ? "Fast withdrawal" : "Free withdrawal"
            }
            tooltip={
              earlyWithdrawEnabled
                ? "Withdraw immediately with a 1% fee."
                : `Request now for free. Window opens after ~${withdrawalDelayLabel} and lasts ~${withdrawalDurationLabel}.`
            }
            enabled={earlyWithdrawEnabled}
            onToggle={() => {
              if (earlyWithdrawEnabled) onDisableEarlyWithdraw();
              else onEnableEarlyWithdraw();
            }}
            disabled={disabled}
            ariaLabel="Toggle fast withdrawal"
          />
        </div>
      ) : null}

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
        <RequestWithdrawalInfoBox
          position={position}
          helperText={helperText}
          withdrawalDelayLabel={withdrawalDelayLabel}
          withdrawalDurationLabel={withdrawalDurationLabel}
        />
      )}

      {showWithdrawOnlyToggle && onWithdrawOnlyChange ? (
        <div className="space-y-1">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Mode</p>
          <ModeToggleRow
            label={withdrawOnly ? "Withdraw only" : "Withdraw + redeem"}
            tooltip={
              withdrawOnly
                ? `Receive ${peggedTokenSymbol} in your wallet without redeeming to collateral.`
                : "Withdraw from the pool and redeem to collateral in one step."
            }
            enabled={withdrawOnly}
            onToggle={() => onWithdrawOnlyChange(!withdrawOnly)}
            disabled={disabled}
            ariaLabel="Toggle withdraw only"
          />
        </div>
      ) : null}
    </div>
  );
}
