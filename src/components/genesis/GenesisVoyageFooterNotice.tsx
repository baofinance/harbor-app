"use client";

import Link from "next/link";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_DOCS_URL } from "@/config/maidenVoyageFeatured";
import { MV_CARD_SHELL, MV_ICON_BADGE_NEUTRAL } from "./maidenVoyageLayoutStyles";

export function GenesisVoyageFooterNotice() {
  return (
    <footer className="mt-8">
      <div className={`${MV_CARD_SHELL} flex gap-3 px-4 py-4 sm:px-5 sm:py-5`}>
        <span className={`mt-0.5 ${MV_ICON_BADGE_NEUTRAL}`} aria-hidden>
          <LockClosedIcon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-white/65">
            Once a voyage is completed, deposits are locked and cannot be
            withdrawn. You will be able to claim your Anchor + Sail tokens after
            market launch.
          </p>
          <a
            href={MAIDEN_VOYAGE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
          >
            Learn more
          </a>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-white/40">
        Maiden Voyage 2.0 is part of the{" "}
        <Link
          href="/"
          className="font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
        >
          Harbor
        </Link>{" "}
        protocol.
      </p>
    </footer>
  );
}
