"use client";

import { Info } from "lucide-react";
import SimpleTooltip from "@/components/SimpleTooltip";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";
import {
  DEPOSIT_MODE_TOGGLE_ROW_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
  DEPOSIT_TAG_CORAL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type {
  AnchorRedeemPosition,
  AnchorRedeemStepActionKind,
} from "@/utils/anchorRedeemPositions";
import { AnchorRedeemSelectedPositionSummary } from "./AnchorRedeemSelectedPositionSummary";

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

  const timingRows = pendingLabel
    ? [
        { label: "Fee-free window", value: pendingLabel },
        { label: "Fee-free duration", value: withdrawalDurationLabel },
      ]
    : openLabel
      ? [
          { label: "Fee-free window", value: openLabel },
          { label: "Fee-free duration", value: withdrawalDurationLabel },
        ]
      : [
          { label: "Fee-free window opens in", value: withdrawalDelayLabel },
          { label: "Fee-free window duration", value: withdrawalDurationLabel },
        ];

  const footer =
    helperText ??
    (pendingLabel
      ? "Come back during the fee-free window to complete your withdrawal."
      : openLabel
        ? "Complete your withdrawal before the fee-free window closes."
        : "After your withdraw request is made, come back in the fee-free window to complete your withdrawal.");

  return (
    <div
      className="rounded-xl bg-[#1E4775]/[0.06] px-3 py-3"
      role="note"
    >
      <div className="space-y-2">
        <div className="space-y-1.5">
          {timingRows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-[#1E4775]/60">{row.label}</span>
              <span className="shrink-0 rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1E4775]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-[#1E4775]/55">{footer}</p>
      </div>
    </div>
  );
}

function SpeedToggleRow({
  label,
  tooltip,
  enabled,
  onToggle,
  disabled,
  ariaLabel,
  badge,
}: {
  label: string;
  tooltip: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  ariaLabel: string;
  badge?: string;
}) {
  return (
    <div className={DEPOSIT_MODE_TOGGLE_ROW_CLASS}>
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="text-xs font-semibold text-[#1E4775]">{label}</p>
        {badge ? (
          <span className={`shrink-0 ${DEPOSIT_TAG_CORAL_CLASS}`}>{badge}</span>
        ) : null}
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
      <AnchorRedeemSelectedPositionSummary
        position={position}
        peggedTokenSymbol={peggedTokenSymbol}
        disabled={disabled}
        onChangePosition={onChangePosition}
        showModeToggle={showWithdrawOnlyToggle}
        withdrawOnly={withdrawOnly}
        onWithdrawOnlyChange={onWithdrawOnlyChange}
      />

      {canToggleSpeed ? (
        <div className="space-y-1">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Speed</p>
          <SpeedToggleRow
            label={
              earlyWithdrawEnabled ? "Fast withdrawal" : "Free withdrawal"
            }
            badge={earlyWithdrawEnabled ? "1.00% fee" : undefined}
            tooltip={
              earlyWithdrawEnabled
                ? "Withdraw immediately with a 1.00% fee."
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
    </div>
  );
}
