"use client";

import { Info } from "lucide-react";
import SimpleTooltip from "@/components/SimpleTooltip";
import {
  DEPOSIT_MODE_TOGGLE_ROW_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type { AnchorRedeemPosition } from "@/utils/anchorRedeemPositions";
import { AnchorRedeemPositionRow } from "./AnchorRedeemPositionRow";

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

export type AnchorRedeemSelectedPositionSummaryProps = {
  position: AnchorRedeemPosition;
  peggedTokenSymbol: string;
  disabled?: boolean;
  /** Omit to hide Change (e.g. locked final review). */
  onChangePosition?: () => void;
  showModeToggle?: boolean;
  withdrawOnly?: boolean;
  onWithdrawOnlyChange?: (enabled: boolean) => void;
};

/** Mode (optional) + compact selected-position card for post-pick steps. */
export function AnchorRedeemSelectedPositionSummary({
  position,
  peggedTokenSymbol,
  disabled = false,
  onChangePosition,
  showModeToggle = false,
  withdrawOnly = false,
  onWithdrawOnlyChange,
}: AnchorRedeemSelectedPositionSummaryProps) {
  return (
    <div className="space-y-2.5">
      {showModeToggle && onWithdrawOnlyChange ? (
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

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Selected position</p>
          {onChangePosition ? (
            <button
              type="button"
              onClick={onChangePosition}
              disabled={disabled}
              className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#1E4775]/70 transition hover:bg-[#1E4775]/5 hover:text-[#1E4775] disabled:opacity-50"
            >
              Change
            </button>
          ) : null}
        </div>
        <AnchorRedeemPositionRow
          position={position}
          peggedTokenSymbol={peggedTokenSymbol}
          selected
          compact
        />
      </div>
    </div>
  );
}
