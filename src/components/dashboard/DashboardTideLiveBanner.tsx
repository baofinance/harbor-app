"use client";

import Link from "next/link";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";
import {
  HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS,
  HARBOR_BTN_PRIMARY_DESKTOP_CLASS,
} from "@/components/shared/harborButtonStyles";
import {
  DASHBOARD_LINK_CLASS,
  DASHBOARD_NOTICE_PANEL_CLASS,
  DASHBOARD_NOTICE_PANEL_INNER_CLASS,
} from "./dashboardStyles";

export function DashboardTideLiveBanner() {
  const buyUrl = TIDE_POL_SWAP_CONFIG.uniswapPoolUrl;

  return (
    <div
      className={`${DASHBOARD_NOTICE_PANEL_CLASS} bg-gradient-to-r from-harbor-coral/[0.08] via-transparent to-harbor-mint/[0.06] ring-1 ring-harbor-coral/20`}
      role="region"
      aria-label="TIDE is live and Maiden Voyage 2.0 launching soon"
    >
      <div className={DASHBOARD_NOTICE_PANEL_INNER_CLASS}>
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-white/95 sm:text-base">
              TIDE is live
            </p>
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
              Claim your airdrop or buy TIDE on Uniswap.
            </p>
          </div>
          <p className="text-xs text-white/75 sm:text-sm">
            <Link href="/genesis" className={DASHBOARD_LINK_CLASS}>
              Maiden Voyage 2.0
            </Link>
            : Own a Market launching soon
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
