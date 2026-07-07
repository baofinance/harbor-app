"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";
import {
  HARBOR_BTN_GLASS_CORAL_DARK,
  HARBOR_BTN_GLASS_MINT_DARK,
  HARBOR_BTN_GLASS_PILL_OUTLINE_DARK_CLASS,
} from "@/components/shared/harborButtonStyles";

function PromoBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "coral" | "mint";
}) {
  const toneClass =
    tone === "coral"
      ? "border-harbor-coral/50 bg-harbor-coral/25 text-[#FFD4CC]"
      : "border-harbor-mint/50 bg-harbor-mint/25 text-[#C8F5E4]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:text-[10px] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function DashboardTideLiveBanner() {
  const buyUrl = TIDE_POL_SWAP_CONFIG.uniswapPoolUrl;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_8px_32px_-10px_rgba(0,0,0,0.22)]"
      role="region"
      aria-label="Featured Harbor products"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative flex flex-col gap-2.5 border-b border-white/12 bg-gradient-to-br from-harbor-mint/[0.14] via-transparent to-transparent px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 md:border-b-0 md:border-r">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-harbor-mint/20 blur-2xl"
          />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <PromoBadge tone="mint">Live now</PromoBadge>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-harbor-mint/90 sm:text-[11px]">
                Tide
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-white sm:text-base">
              TIDE is live
            </p>
            <p className="mt-0.5 text-xs leading-snug text-white/75">
              Claim your airdrop or buy on Uniswap.
            </p>
          </div>
          <div className="relative flex shrink-0 flex-wrap gap-1.5">
            <Link
              href="/tide"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${HARBOR_BTN_GLASS_MINT_DARK}`}
            >
              Claim
              <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${HARBOR_BTN_GLASS_PILL_OUTLINE_DARK_CLASS} px-3 py-1.5 text-xs`}
            >
              Buy
            </a>
          </div>
        </div>

        <div className="relative flex flex-col gap-2.5 bg-gradient-to-br from-harbor-coral/[0.14] via-transparent to-transparent px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-harbor-coral/20 blur-2xl"
          />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <PromoBadge tone="coral">Launching soon</PromoBadge>
              <span className="rounded border border-white/30 bg-white/12 px-1 py-0.5 text-[9px] font-bold font-mono text-white sm:text-[10px]">
                2.0
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-white sm:text-base">
              Maiden Voyage · Own a Market
            </p>
            <p className="mt-0.5 text-xs leading-snug text-white/75">
              Stake your claim as a founding shareholder.
            </p>
          </div>
          <Link
            href="/genesis"
            className={`relative inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs ${HARBOR_BTN_GLASS_CORAL_DARK}`}
          >
            Explore
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
