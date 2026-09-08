"use client";

import { formatEther } from "viem";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type { AnchorRedeemPosition } from "@/utils/anchorRedeemPositions";
import {
  redeemPositionSubtitle,
  redeemPositionTitle,
} from "@/utils/anchorRedeemPositions";

function formatHaBalance(balance: bigint): string {
  const n = Number(formatEther(balance));
  if (!Number.isFinite(n)) return "0";
  if (n > 0 && n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export type AnchorRedeemPositionListProps = {
  positions: readonly AnchorRedeemPosition[];
  peggedTokenSymbol: string;
  selectedKey: string | null;
  disabled?: boolean;
  onSelect: (position: AnchorRedeemPosition) => void;
};

export function AnchorRedeemPositionList({
  positions,
  peggedTokenSymbol,
  selectedKey,
  disabled = false,
  onSelect,
}: AnchorRedeemPositionListProps) {
  if (positions.length === 0) {
    return (
      <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} px-3 py-6 text-center`}>
        <p className="text-sm font-semibold text-[#1E4775]">No positions</p>
        <p className="mt-1 text-xs leading-snug text-[#1E4775]/65">
          You don&apos;t hold any {peggedTokenSymbol} in your wallet or Earn
          pools yet. Mint first to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className={DEPOSIT_SECTION_LABEL_CLASS}>Your positions</p>
      <ul className="space-y-1.5" role="listbox" aria-label="Redeem positions">
        {positions.map((position) => {
          const selected = position.key === selectedKey;
          const subtitle = redeemPositionSubtitle(position);
          const ready =
            position.kind === "pool" && position.windowOpen === true;
          return (
            <li key={position.key}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onSelect(position)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-[#1E4775]/35 bg-white/95 shadow-sm"
                    : "border-[#1E4775]/12 bg-white/70 hover:border-[#1E4775]/22 hover:bg-white/85"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#1E4775]">
                      {redeemPositionTitle(position, peggedTokenSymbol)}
                    </span>
                    {ready ? (
                      <span className="shrink-0 rounded-full bg-[#4A9784]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2f6f5f]">
                        Ready
                      </span>
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p className="mt-0.5 truncate text-[11px] text-[#1E4775]/55">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums text-[#1E4775]">
                    {formatHaBalance(position.balance)}
                  </p>
                  <p className="text-[10px] font-medium text-[#1E4775]/50">
                    {peggedTokenSymbol}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
