"use client";

import {
  BASIC_MARKET_COMING_SOON_CHIP_CLASS,
  BASIC_MARKET_COMING_SOON_NEUTRAL_DOT_CLASS,
  BASIC_MARKET_STATUS_DEPOSIT_DOT_CLASS,
  BASIC_MARKET_STATUS_DEPOSIT_TEXT_CLASS,
  BASIC_MARKET_STATUS_NEUTRAL_DOT_CLASS,
  BASIC_MARKET_STATUS_NEUTRAL_TEXT_CLASS,
  BASIC_MARKET_STATUS_ROW_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";

export type HarborBasicMarketStatusVariant =
  | "coming-soon"
  | "deposit"
  | "no-deposit";

type HarborBasicMarketStatusRowProps = {
  variant: HarborBasicMarketStatusVariant;
  /** Shown when variant is `deposit` (e.g. "Your deposit · $3.96k"). */
  label?: string;
  className?: string;
  theme?: "light" | "dark";
};

/**
 * Single status line for Anchor / Sail basic cards: coming soon chip, deposit, or no deposit.
 */
export function HarborBasicMarketStatusRow({
  variant,
  label,
  className = "",
  theme = "light",
}: HarborBasicMarketStatusRowProps) {
  const depositTextClass =
    theme === "dark"
      ? "text-xs font-semibold uppercase tracking-wide text-[#B8EBD5]"
      : BASIC_MARKET_STATUS_DEPOSIT_TEXT_CLASS;
  const neutralTextClass =
    theme === "dark"
      ? "text-xs font-semibold uppercase tracking-wide text-white/50"
      : BASIC_MARKET_STATUS_NEUTRAL_TEXT_CLASS;

  if (variant === "coming-soon") {
    return (
      <span className={`${BASIC_MARKET_COMING_SOON_CHIP_CLASS} ${className}`.trim()}>
        <span className={BASIC_MARKET_COMING_SOON_NEUTRAL_DOT_CLASS} aria-hidden />
        <span>Coming soon</span>
      </span>
    );
  }

  const isDeposit = variant === "deposit";
  const displayLabel = isDeposit
    ? (label ?? "Your deposit")
    : "No deposit";

  return (
    <span className={`${BASIC_MARKET_STATUS_ROW_CLASS} ${className}`.trim()}>
      <span
        className={
          isDeposit
            ? BASIC_MARKET_STATUS_DEPOSIT_DOT_CLASS
            : BASIC_MARKET_STATUS_NEUTRAL_DOT_CLASS
        }
        aria-hidden
      />
      <span className={isDeposit ? depositTextClass : neutralTextClass}>
        {displayLabel}
      </span>
    </span>
  );
}
