"use client";

import { formatEther } from "viem";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import { formatUSD } from "@/utils/formatters";
import type { AnchorRedeemPosition } from "@/utils/anchorRedeemPositions";
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

function formatAprLabel(apr: number | undefined): string {
  if (apr === undefined || !Number.isFinite(apr)) return "—";
  if (apr === 0) return "0.00%";
  if (apr < 0.01) return "<0.01%";
  if (apr > 1000) return ">1000%";
  return `${apr.toFixed(2)}%`;
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
          You don&apos;t hold any {peggedTokenSymbol} in your wallet or
          stability pools yet. Mint first to get started.
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
          const ready =
            position.kind === "pool" && position.windowOpen === true;
          const usdLabel =
            position.usdValue !== undefined && position.usdValue > 0
              ? formatUSD(position.usdValue, { compact: false })
              : null;
          const aprLabel =
            position.kind === "wallet"
              ? "—"
              : formatAprLabel(position.apr);

          return (
            <li key={position.key}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onSelect(position)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-[#1E4775]/35 bg-white/95 shadow-sm"
                    : "border-[#1E4775]/12 bg-white/70 hover:border-[#1E4775]/22 hover:bg-white/85"
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-[#1E4775]">
                    {redeemPositionTitle(position, peggedTokenSymbol)}
                  </span>
                  {ready ? (
                    <span className="shrink-0 rounded-full bg-[#4A9784]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#2f6f5f]">
                      Ready
                    </span>
                  ) : null}
                </div>

                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#1E4775]/70">
                  {aprLabel}
                  {position.kind === "pool" ? (
                    <span className="ml-0.5 font-medium text-[#1E4775]/45">
                      APR
                    </span>
                  ) : null}
                </span>

                <div className="min-w-[4.75rem] shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums leading-tight text-[#1E4775]">
                    {formatHaBalance(position.balance)}{" "}
                    <span className="text-[11px] font-semibold text-[#1E4775]/65">
                      {peggedTokenSymbol}
                    </span>
                  </p>
                  {usdLabel ? (
                    <p className="font-mono text-[10px] tabular-nums leading-tight text-[#1E4775]/50">
                      ({usdLabel})
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
