"use client";

import type { ReactNode } from "react";
import { formatEther } from "viem";
import { TokenLogo } from "@/components/shared";
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

function rewardTokensForPosition(position: AnchorRedeemPosition): string[] {
  if (position.kind !== "pool") return [];
  const rewards = (
    position.market as { rewardTokens?: { default?: string[] } } | undefined
  )?.rewardTokens?.default;
  return Array.isArray(rewards) ? rewards.filter(Boolean) : [];
}

export type AnchorRedeemPositionRowProps = {
  position: AnchorRedeemPosition;
  peggedTokenSymbol: string;
  /** When set, renders as a button (list). Otherwise as a static summary. */
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  className?: string;
};

/** Two-line position summary shared by choose-position list and request step. */
export function AnchorRedeemPositionRow({
  position,
  peggedTokenSymbol,
  onSelect,
  selected = false,
  disabled = false,
  trailing,
  className = "",
}: AnchorRedeemPositionRowProps) {
  const usdLabel =
    position.usdValue !== undefined && position.usdValue > 0
      ? formatUSD(position.usdValue, { compact: false })
      : null;
  const aprLabel =
    position.kind === "wallet" ? "—" : formatAprLabel(position.apr);
  const rewardTokens = rewardTokensForPosition(position);
  const requestStatus =
    position.kind === "pool" ? position.requestStatus : undefined;
  const ready =
    position.kind === "pool" &&
    (position.windowOpen === true || requestStatus?.state === "open");

  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-medium leading-tight text-[#1E4775]/70">
          {redeemPositionTitle(position, peggedTokenSymbol)}
        </p>
        {requestStatus?.state === "pending" ? (
          <span className="shrink-0 rounded-full bg-[#1E4775]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1E4775]/75">
            {requestStatus.label}
          </span>
        ) : ready ? (
          <span className="shrink-0 rounded-full bg-[#4A9784]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#2f6f5f]">
            {requestStatus?.label ?? "Ready"}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {rewardTokens.length > 0 ? (
            <span className="flex shrink-0 items-center -space-x-1">
              {rewardTokens.slice(0, 2).map((token) => (
                <TokenLogo
                  key={token}
                  symbol={token}
                  size={14}
                  className="ring-1 ring-white"
                />
              ))}
            </span>
          ) : null}
          <span className="truncate text-sm font-semibold tabular-nums text-[#1E4775]">
            {aprLabel}
            {position.kind === "pool" ? (
              <span className="ml-1 text-[11px] font-medium text-[#1E4775]/50">
                APR
              </span>
            ) : null}
          </span>
        </div>

        <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#1E4775]">
          {formatHaBalance(position.balance)}{" "}
          <span className="text-[11px] font-semibold text-[#1E4775]/65">
            {peggedTokenSymbol}
          </span>
        </p>

        {usdLabel ? (
          <p className="shrink-0 font-mono text-xs tabular-nums text-[#1E4775]/55">
            {usdLabel}
          </p>
        ) : null}

        {trailing}
      </div>
    </>
  );

  const rowClass = `flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition ${
    selected
      ? "border-[#1E4775]/35 bg-white/95 shadow-sm"
      : "border-[#1E4775]/12 bg-white/70"
  } ${className}`;

  if (onSelect) {
    return (
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={onSelect}
        className={`${rowClass} hover:border-[#1E4775]/22 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
