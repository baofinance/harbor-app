"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";
import {
  HARBOR_BTN_GLASS_CORAL_DARK,
  HARBOR_BTN_GLASS_MINT_DARK,
  HARBOR_BTN_GLASS_PILL_OUTLINE_DARK_CLASS,
} from "@/components/shared/harborButtonStyles";
import { MV_CARD_SHELL } from "@/components/genesis/maidenVoyageLayoutStyles";

function PromoBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "coral" | "mint";
}) {
  const toneClass =
    tone === "coral"
      ? "border-harbor-coral/35 bg-harbor-coral/15 text-harbor-coral"
      : "border-harbor-mint/35 bg-harbor-mint/15 text-harbor-mint";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function DashboardTideLiveBanner() {
  const buyUrl = TIDE_POL_SWAP_CONFIG.uniswapPoolUrl;

  return (
    <section
      className={`${MV_CARD_SHELL} overflow-hidden`}
      role="region"
      aria-label="Featured Harbor products"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative overflow-hidden border-b border-white/10 p-4 sm:p-5 md:border-b-0 md:border-r">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-harbor-coral/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-harbor-coral/80 via-harbor-coral/40 to-transparent"
          />

          <div className="relative flex h-full min-h-[9.5rem] flex-col justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PromoBadge tone="coral">Launching soon</PromoBadge>
                <span className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold font-mono text-white">
                  2.0
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-harbor-coral/90">
                  Maiden Voyage
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Own a Market
                </h2>
                <p className="mt-1.5 max-w-sm text-sm leading-snug text-white/70">
                  Become a founding shareholder in Harbor&apos;s next markets before
                  they launch.
                </p>
              </div>
            </div>

            <Link
              href="/genesis"
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm ${HARBOR_BTN_GLASS_CORAL_DARK}`}
            >
              Explore Maiden Voyage
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-harbor-mint/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-harbor-mint/80 via-harbor-mint/40 to-transparent"
          />

          <div className="relative flex h-full min-h-[9.5rem] flex-col justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <PromoBadge tone="mint">Live now</PromoBadge>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-harbor-mint/90">
                  Tide
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  TIDE is live
                </h2>
                <p className="mt-1.5 max-w-sm text-sm leading-snug text-white/70">
                  Claim your airdrop allocation or buy TIDE on Uniswap.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/tide"
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm ${HARBOR_BTN_GLASS_MINT_DARK}`}
              >
                Claim airdrop
                <ChevronRightIcon className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={HARBOR_BTN_GLASS_PILL_OUTLINE_DARK_CLASS}
              >
                Buy on Uniswap
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
