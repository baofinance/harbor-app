"use client";

import React from "react";
import { getLogoPath } from "@/lib/logos";

export interface ProtocolBannerProps {
  /** Protocol name (e.g. "Sail", "Anchor") */
  protocolName: string;
  /** Primary token symbol (e.g. haETH, haBTC) */
  tokenSymbol: string;
  /** Optional icon URL. If not provided, falls back to getLogoPath(tokenSymbol) */
  tokenIcon?: string;
  /**
   * Optional leveraged / Sail token (e.g. hsFXUSD-ETH) — shown after primary as "ha + hs".
   * Used on Genesis modal alongside pegged token.
   */
  secondaryTokenSymbol?: string;
  secondaryTokenIcon?: string;
}

function TokenBadge({
  symbol,
  iconSrc,
}: {
  symbol: string;
  iconSrc: string;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <img
        src={iconSrc}
        alt={symbol}
        className="h-[18px] w-[18px] flex-shrink-0 rounded-full bg-[#1E4775]/10 ring-1 ring-[#1E4775]/15 sm:h-5 sm:w-5"
      />
      <span className="max-w-[9rem] truncate text-xs font-semibold text-[#1E4775] sm:max-w-[12rem] sm:text-sm">
        {symbol}
      </span>
    </div>
  );
}

/**
 * Protocol title row for Sail, Anchor, and Genesis modals (light bar + navy text; matches modal body, no blue bleed).
 */
export function ProtocolBanner({
  protocolName,
  tokenSymbol,
  tokenIcon,
  secondaryTokenSymbol,
  secondaryTokenIcon,
}: ProtocolBannerProps) {
  const primaryIcon = tokenIcon ?? getLogoPath(tokenSymbol);
  const showPair =
    secondaryTokenSymbol &&
    secondaryTokenSymbol.trim() !== "" &&
    secondaryTokenSymbol !== tokenSymbol;
  const secondaryIcon =
    secondaryTokenIcon ?? getLogoPath(secondaryTokenSymbol ?? "");

  return (
    <div className="flex w-full items-center justify-between gap-2 bg-white px-3 py-2 text-[#1E4775] sm:px-3.5 sm:py-2.5 sm:gap-2">
      <div className="shrink-0 text-base font-bold leading-snug tracking-tight text-[#153B63] sm:text-lg">
        {protocolName}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
        <TokenBadge symbol={tokenSymbol} iconSrc={primaryIcon} />
        {showPair && (
          <>
            <span
              className="shrink-0 text-xs font-semibold text-[#1E4775]/50 sm:text-sm"
              aria-hidden
            >
              +
            </span>
            <TokenBadge symbol={secondaryTokenSymbol} iconSrc={secondaryIcon} />
          </>
        )}
      </div>
    </div>
  );
}
