"use client";

import React from "react";
import { getLogoPath } from "@/lib/logos";

export type DepositModalTitleProps = {
  protocolName: string;
  tokenSymbol: string;
  actionLabel: string;
  tokenIcon?: string;
  secondaryTokenSymbol?: string;
  secondaryTokenIcon?: string;
};

function TokenIcon({ symbol, iconSrc }: { symbol: string; iconSrc: string }) {
  return (
    <img
      src={iconSrc}
      alt=""
      className="h-4 w-4 flex-shrink-0 rounded-full bg-[#1E4775]/10 ring-1 ring-[#1E4775]/15 sm:h-[18px] sm:w-[18px]"
      aria-hidden
    />
  );
}

/** Modal title row with token icon(s), e.g. Anchor · haBTC — Withdraw */
export function DepositModalTitle({
  protocolName,
  tokenSymbol,
  actionLabel,
  tokenIcon,
  secondaryTokenSymbol,
  secondaryTokenIcon,
}: DepositModalTitleProps) {
  const primaryIcon = tokenIcon ?? getLogoPath(tokenSymbol);
  const showPair =
    secondaryTokenSymbol &&
    secondaryTokenSymbol.trim() !== "" &&
    secondaryTokenSymbol !== tokenSymbol;
  const secondaryIcon =
    secondaryTokenIcon ?? getLogoPath(secondaryTokenSymbol ?? "");

  return (
    <span className="flex min-w-0 items-center gap-1 sm:gap-1.5">
      <span className="shrink-0">{protocolName}</span>
      <span className="shrink-0 font-normal text-[#1E4775]/45" aria-hidden>
        ·
      </span>
      <span className="flex min-w-0 items-center gap-1">
        <TokenIcon symbol={tokenSymbol} iconSrc={primaryIcon} />
        <span className="truncate">{tokenSymbol}</span>
        {showPair ? (
          <>
            <span
              className="shrink-0 font-normal text-[#1E4775]/45"
              aria-hidden
            >
              +
            </span>
            <TokenIcon
              symbol={secondaryTokenSymbol}
              iconSrc={secondaryIcon}
            />
            <span className="truncate">{secondaryTokenSymbol}</span>
          </>
        ) : null}
      </span>
      <span className="shrink-0 font-normal text-[#1E4775]/45" aria-hidden>
        —
      </span>
      <span className="shrink-0">{actionLabel}</span>
    </span>
  );
}
