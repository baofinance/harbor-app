"use client";

import { usePathname } from "next/navigation";

/** Matches sticky Mint/Redeem and Buy/Sell bar height on Earn / Leverage. */
export const MOBILE_TRADE_BAR_CLEARANCE_CLASS =
  "h-[calc(4.25rem+env(safe-area-inset-bottom))] lg:hidden";

/**
 * Spacer below the site footer on Earn/Leverage so Docs / Terms / Privacy
 * can scroll above the fixed mobile trade bar.
 */
export function MobileTradeBarScrollClearance() {
  const pathname = usePathname() ?? "";
  const needsClearance =
    pathname.startsWith("/anchor") || pathname.startsWith("/sail");

  if (!needsClearance) return null;

  return (
    <div
      className={MOBILE_TRADE_BAR_CLEARANCE_CLASS}
      aria-hidden
    />
  );
}
