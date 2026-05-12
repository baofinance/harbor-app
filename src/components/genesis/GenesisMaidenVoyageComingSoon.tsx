"use client";

import Image from "next/image";
import React from "react";

/**
 * Full-page placeholder when Maiden Voyage is gated behind a “coming soon” flag.
 * Isolated so it can be deleted or moved (e.g. another route) without editing the main genesis page body.
 */
export function GenesisMaidenVoyageComingSoon() {
  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1300px] flex-1 flex-col font-sans text-white">
      <main className="container mx-auto px-4 pb-6 pt-2 sm:px-10 sm:pt-4">
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.55)]">
            <Image
              src="/MV2.png"
              alt="Deposit once, own a share, earn forever. Coming soon."
              width={1024}
              height={681}
              priority
              className="h-auto w-full"
            />
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/40 bg-[#CFE5DD]/95 px-4 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] sm:bottom-6 sm:left-6 sm:px-5 sm:py-2.5">
              <span className="font-mono text-lg font-extrabold tracking-[0.12em] text-[#2F4572] sm:text-2xl">
                COMING SOON
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
