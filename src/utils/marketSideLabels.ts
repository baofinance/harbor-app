/**
 * Shared helpers for Sail / Genesis-style market “long” vs “short” labels from config or token name.
 * Keeps parsing logic in one place to avoid drift between index pages.
 */

import type { DefinedMarket } from "@/config/markets";

// Parse the "long" side from token name (fetched from contract)
// e.g. "Harbor Short USD versus stETH" → "stETH"
export function parseLongSide(
  tokenName: string | undefined,
  market: DefinedMarket
): string {
  if (tokenName) {
    const versusMatch = tokenName.match(/versus\s+(\w+)/i);
    if (versusMatch) return versusMatch[1];

    const longMatch = tokenName.match(/Long\s+(\w+)/i);
    if (longMatch) return longMatch[1];
  }

  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

// Parse the "short" side from token name
// e.g. "Harbor Short USD versus stETH" → "USD"
export function parseShortSide(
  tokenName: string | undefined,
  market: DefinedMarket
): string {
  if (tokenName) {
    const shortMatch = tokenName.match(/Short\s+(\w+)/i);
    if (shortMatch) return shortMatch[1];
  }

  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

/** Long side from market config (for grouping / filters). */
export function getLongSide(market: DefinedMarket): string {
  const desc = market.leveragedToken?.description || "";
  const match = desc.match(/Long\s+(\w+)/i);
  if (match) return match[1];

  const name = market.leveragedToken?.name || "";
  const versusMatch = name.match(/versus\s+(\w+)/i);
  if (versusMatch) return versusMatch[1];

  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}

/** Short side from market config (for display when contract data isn't loaded). */
export function getShortSide(market: DefinedMarket): string {
  const desc = market.leveragedToken?.description || "";
  const shortMatch = desc.match(/short\s+(\w+)/i);
  if (shortMatch) return shortMatch[1];

  const name = market.leveragedToken?.name || "";
  const nameShortMatch = name.match(/Short\s+(\w+)/i);
  if (nameShortMatch) return nameShortMatch[1];

  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
  if (longMatch) return longMatch[1];

  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];

  return "Other";
}
