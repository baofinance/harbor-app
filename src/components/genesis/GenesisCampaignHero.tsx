"use client";

import {
  getFeaturedVoyageNumber,
  MAIDEN_VOYAGE_DOCS_URL,
} from "@/config/maidenVoyageFeatured";

/**
 * Maiden Voyage 2.0 landing hero — title, headline, subheading, docs link.
 */
export function GenesisCampaignHero() {
  return (
    <div className="mb-6 flex flex-col">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent px-4 py-6 shadow-[0_0_40px_-12px_rgba(255,138,122,0.35)] sm:px-8 sm:py-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Maiden Voyage 2.0
        </p>
        <h1 className="mt-3 text-center font-mono text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl">
          <span className="block">Own a piece of the market.</span>
          <span className="mt-1 block bg-gradient-to-r from-[#FF8A7A] to-[#ffb4a8] bg-clip-text text-transparent">
            Earn forever.
          </span>
        </h1>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <p className="max-w-xl text-center text-base font-medium leading-snug text-white/85 sm:text-lg">
            Help bootstrap a market. Earn from it forever.
          </p>
          <a
            href={MAIDEN_VOYAGE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-[#FF8A7A]/50 bg-[#FF8A7A]/15 px-4 py-2 text-sm font-semibold text-[#FFE8E2] transition hover:border-[#FF8A7A]/80 hover:bg-[#FF8A7A]/25"
          >
            How it works
          </a>
        </div>
        <p className="sr-only">
          Active campaign: Maiden Voyage #{getFeaturedVoyageNumber()}
        </p>
      </div>
    </div>
  );
}
