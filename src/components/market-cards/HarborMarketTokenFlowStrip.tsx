"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Vault, Wallet } from "lucide-react";
import { TokenLogo } from "@/components/shared";
import {
  BASIC_MARKET_FLOW_ARROW_CLASS,
  BASIC_MARKET_FLOW_LOGO_PX,
  BASIC_MARKET_ICON_WELL_CLASS,
  BASIC_MARKET_TOKEN_STRIP_DARK_ARROW_CLASS,
  BASIC_MARKET_TOKEN_STRIP_DARK_OUTER_CLASS,
  BASIC_MARKET_TOKEN_STRIP_DARK_ROW_CLASS,
  BASIC_MARKET_TOKEN_STRIP_OUTER_CLASS,
  BASIC_MARKET_TOKEN_STRIP_ROW_CLASS,
} from "./harborBasicMarketTokens";

export type HarborMarketTokenFlowStripProps = {
  collateralSymbol: string;
  peggedSymbol: string;
  /** When set, renders collateral → pegged + leveraged (Maiden Voyage). */
  leveragedSymbol?: string;
  theme?: "light" | "dark";
  /** `boxed` = bordered strip; `inline` = no shell, icons spread in parent (Maiden Voyage card). */
  variant?: "boxed" | "inline";
  /** Overrides leveraged token label under icon (e.g. longETH-shortUSD). */
  leveragedDisplayLabel?: string;
  className?: string;
};

function stripLabel(symbol: string): string {
  const s = symbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "wstETH";
  if (lower === "steth") return "stETH";
  if (lower === "hausd") return "haUSD";
  if (lower.startsWith("hs")) return `hs${s.slice(2)}`;
  if (lower.startsWith("ha")) return `ha${s.slice(2)}`;
  return s;
}

/**
 * Token flow strip shared by Anchor / Sail basic cards (light) and Maiden Voyage (dark).
 */
export function HarborMarketTokenFlowStrip({
  collateralSymbol,
  peggedSymbol,
  leveragedSymbol,
  theme = "light",
  variant = "boxed",
  leveragedDisplayLabel,
  className = "",
}: HarborMarketTokenFlowStripProps) {
  const isDark = theme === "dark";
  const isInline = variant === "inline";
  const outer = isDark
    ? BASIC_MARKET_TOKEN_STRIP_DARK_OUTER_CLASS
    : BASIC_MARKET_TOKEN_STRIP_OUTER_CLASS;
  const row = isInline
    ? isDark
      ? "flex min-h-[44px] w-full flex-nowrap items-center justify-evenly gap-0 px-0.5 text-white/85 sm:px-1"
      : "flex min-h-[44px] w-full flex-nowrap items-center justify-evenly gap-0 px-0.5 text-[#1E4775] sm:px-1"
    : isDark
      ? BASIC_MARKET_TOKEN_STRIP_DARK_ROW_CLASS
      : BASIC_MARKET_TOKEN_STRIP_ROW_CLASS;
  const arrow = isDark
    ? BASIC_MARKET_TOKEN_STRIP_DARK_ARROW_CLASS
    : BASIC_MARKET_FLOW_ARROW_CLASS;
  const iconWellText = isDark ? "text-white/85" : "text-[#1E4775]";
  const mutedText = isDark ? "text-white/45" : "text-[#1E4775]/60";

  const collateral = stripLabel(collateralSymbol);
  const pegged = stripLabel(peggedSymbol);
  const leveraged = leveragedSymbol
    ? leveragedDisplayLabel ?? stripLabel(leveragedSymbol)
    : null;

  const iconColumnClass =
    "flex min-w-[2.75rem] shrink-0 flex-col items-center gap-0.5 sm:min-w-[3rem]";
  const leveragedIconColumnClass =
    "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 sm:min-w-[5.25rem]";
  const operatorClass =
    isInline && isDark
      ? "shrink-0 min-w-[0.875rem] px-1 text-center text-sm font-semibold leading-none text-white/80"
      : isInline
        ? "shrink-0 min-w-[0.875rem] px-1 text-center text-sm font-semibold leading-none text-[#1E4775]/75"
        : `shrink-0 text-xs font-light ${mutedText}`;

  const ariaLabel = leveraged
    ? `${collateral} to ${pegged} and ${leveraged}`
    : `${collateralSymbol} to ${peggedSymbol}, then wallet or vault`;

  const shellClass = isInline
    ? `max-w-full ${className}`.trim()
    : `${outer} max-w-full ${className}`.trim();

  return (
    <div className={shellClass} title={ariaLabel} aria-label={ariaLabel}>
      <div className={row}>
        <span className={isInline && isDark ? iconColumnClass : `${BASIC_MARKET_ICON_WELL_CLASS} flex flex-col items-center gap-0.5`}>
          <TokenLogo symbol={collateralSymbol} size={BASIC_MARKET_FLOW_LOGO_PX} />
          {isDark ? (
            <span
              className={`font-mono text-[9px] font-semibold leading-tight sm:text-[10px] ${mutedText} ${
                isInline ? "whitespace-nowrap text-center" : ""
              }`}
            >
              {collateral}
            </span>
          ) : null}
        </span>

        {leveraged ? (
          <>
            <span className={operatorClass} aria-hidden>
              =
            </span>
            <span className={isInline && isDark ? iconColumnClass : `${BASIC_MARKET_ICON_WELL_CLASS} flex flex-col items-center gap-0.5`}>
              <TokenLogo symbol={peggedSymbol} size={BASIC_MARKET_FLOW_LOGO_PX} />
              {isDark ? (
                <span
                  className={`font-mono text-[9px] font-semibold leading-tight sm:text-[10px] ${mutedText} ${
                    isInline ? "whitespace-nowrap text-center" : ""
                  }`}
                >
                  {pegged}
                </span>
              ) : null}
            </span>
            <span className={operatorClass} aria-hidden>
              +
            </span>
            <span
              className={
                isInline
                  ? leveragedIconColumnClass
                  : `${BASIC_MARKET_ICON_WELL_CLASS} flex flex-col items-center gap-0.5`
              }
            >
              <TokenLogo symbol={leveragedSymbol!} size={BASIC_MARKET_FLOW_LOGO_PX} />
              {isDark ? (
                <span
                  className={`font-mono text-[9px] font-semibold leading-tight sm:text-[10px] ${mutedText} ${
                    isInline ? "whitespace-nowrap text-center" : ""
                  }`}
                >
                  {leveraged}
                </span>
              ) : null}
            </span>
          </>
        ) : (
          <>
            <ChevronRightIcon className={arrow} aria-hidden />
            <span className={`${BASIC_MARKET_ICON_WELL_CLASS} flex flex-col items-center gap-0.5`}>
              <TokenLogo symbol={peggedSymbol} size={BASIC_MARKET_FLOW_LOGO_PX} />
            </span>
            <ChevronRightIcon className={arrow} aria-hidden />
            <div
              className={`flex shrink-0 flex-col items-center justify-center gap-px ${iconWellText}`}
              aria-hidden
            >
              <span className={BASIC_MARKET_ICON_WELL_CLASS}>
                <Wallet className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className={BASIC_MARKET_ICON_WELL_CLASS}>
                <Vault className="h-5 w-5" strokeWidth={1.75} />
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
