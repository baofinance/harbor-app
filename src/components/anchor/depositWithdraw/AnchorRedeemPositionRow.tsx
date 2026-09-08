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

type RequestTone = "default" | "pending" | "ready";

function requestToneForPosition(position: AnchorRedeemPosition): RequestTone {
  if (position.kind !== "pool") return "default";
  if (position.requestStatus?.state === "pending") return "pending";
  if (position.requestStatus?.state === "open" || position.windowOpen) {
    return "ready";
  }
  return "default";
}

const TONE_STYLES: Record<
  RequestTone,
  {
    row: string;
    rowSelected: string;
    rowHover: string;
    title: string;
    badge: string;
    value: string;
    muted: string;
  }
> = {
  default: {
    row: "border-[#1E4775]/12 bg-white/70",
    rowSelected: "border-[#1E4775]/35 bg-white/95 shadow-sm",
    rowHover: "hover:border-[#1E4775]/22 hover:bg-white/85",
    title: "text-[#1E4775]/70",
    badge: "",
    value: "text-[#1E4775]",
    muted: "text-[#1E4775]/55",
  },
  pending: {
    row: "border-amber-300/70 bg-amber-50/90",
    rowSelected: "border-amber-400 bg-amber-50 shadow-sm",
    rowHover: "hover:border-amber-400 hover:bg-amber-50",
    title: "text-amber-900/70",
    badge:
      "bg-amber-200/70 text-amber-900 ring-1 ring-amber-300/60",
    value: "text-amber-950",
    muted: "text-amber-900/55",
  },
  ready: {
    row: "border-[#4A9784]/35 bg-[#4A9784]/10",
    rowSelected: "border-[#4A9784]/55 bg-[#4A9784]/15 shadow-sm",
    rowHover: "hover:border-[#4A9784]/45 hover:bg-[#4A9784]/14",
    title: "text-[#2f6f5f]/80",
    badge:
      "bg-[#4A9784]/20 text-[#2f6f5f] ring-1 ring-[#4A9784]/30",
    value: "text-[#1f4f44]",
    muted: "text-[#2f6f5f]/65",
  },
};

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
  const tone = requestToneForPosition(position);
  const styles = TONE_STYLES[tone];

  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p
          className={`min-w-0 truncate text-[11px] font-medium leading-tight ${styles.title}`}
        >
          {redeemPositionTitle(position, peggedTokenSymbol)}
        </p>
        {tone === "pending" && requestStatus ? (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}
          >
            {requestStatus.label}
          </span>
        ) : null}
        {tone === "ready" ? (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}
          >
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
          <span
            className={`truncate text-sm font-semibold tabular-nums ${styles.value}`}
          >
            {aprLabel}
            {position.kind === "pool" ? (
              <span className={`ml-1 text-[11px] font-medium ${styles.muted}`}>
                APR
              </span>
            ) : null}
          </span>
        </div>

        <p
          className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${styles.value}`}
        >
          {formatHaBalance(position.balance)}{" "}
          <span className={`text-[11px] font-semibold ${styles.muted}`}>
            {peggedTokenSymbol}
          </span>
        </p>

        {usdLabel ? (
          <p
            className={`shrink-0 font-mono text-xs tabular-nums ${styles.muted}`}
          >
            {usdLabel}
          </p>
        ) : null}

        {trailing}
      </div>
    </>
  );

  const rowClass = `flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition ${
    selected ? styles.rowSelected : styles.row
  } ${className}`;

  if (onSelect) {
    return (
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={onSelect}
        className={`${rowClass} ${styles.rowHover} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
