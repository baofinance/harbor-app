"use client";

import Link from "next/link";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";
import {
  HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS,
  HARBOR_BTN_PRIMARY_DESKTOP_CLASS,
} from "@/components/shared/harborButtonStyles";
import {
  DASHBOARD_NOTICE_PANEL_CLASS,
  DASHBOARD_NOTICE_PANEL_INNER_CLASS,
} from "./dashboardStyles";

export function DashboardTideLiveBanner() {
  const buyUrl = TIDE_POL_SWAP_CONFIG.uniswapPoolUrl;

  return (
    <div
      className={`${DASHBOARD_NOTICE_PANEL_CLASS} bg-gradient-to-r from-harbor-coral/[0.08] via-transparent to-harbor-mint/[0.06] ring-1 ring-harbor-coral/20`}
      role="region"
      aria-label="TIDE is live"
    >
      <div className={DASHBOARD_NOTICE_PANEL_INNER_CLASS}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1E4775] sm:text-base">
            TIDE is live
          </p>
          <p className="mt-0.5 text-xs text-[#1E4775]/70 sm:text-sm">
            Claim your airdrop or buy TIDE on Uniswap.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/tide" className={HARBOR_BTN_PRIMARY_DESKTOP_CLASS}>
            Claim airdrop
          </Link>
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS}
          >
            Buy now
          </a>
        </div>
      </div>
    </div>
  );
}
