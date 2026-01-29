"use client";

import React from "react";
import { Plus } from "lucide-react";
import { getLogoPath } from "@/lib/logos";

export interface TokenDisplay {
  symbol: string;
  icon?: string;
}

interface ModalHeaderProps {
  protocol: string;
  primaryToken: TokenDisplay;
  secondaryToken?: TokenDisplay;
}

/**
 * Protocol header with token icon(s). Supports Genesis (haEUR + sail token) and Anchor/Sail (single token).
 */
export function ModalHeader({
  protocol,
  primaryToken,
  secondaryToken,
}: ModalHeaderProps) {
  const primaryIcon = primaryToken.icon ?? getLogoPath(primaryToken.symbol);
  const secondaryIcon = secondaryToken
    ? (secondaryToken.icon ?? getLogoPath(secondaryToken.symbol))
    : null;

  return (
    <div className="bg-[#1E4775] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
      <div className="text-sm sm:text-base font-semibold">{protocol}</div>
      <div className="flex items-center gap-2">
        <img
          src={primaryIcon}
          alt={primaryToken.symbol}
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
        />
        <span className="text-sm sm:text-base font-bold">{primaryToken.symbol}</span>
        {secondaryToken && secondaryIcon && (
          <>
            <Plus
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-white"
              strokeWidth={3}
              aria-hidden
            />
            <img
              src={secondaryIcon}
              alt={secondaryToken.symbol}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
            />
            <span className="text-sm sm:text-base font-bold">{secondaryToken.symbol}</span>
          </>
        )}
      </div>
    </div>
  );
}
