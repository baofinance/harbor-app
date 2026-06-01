"use client";

import { PlayCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_DOCS_URL } from "@/config/maidenVoyageFeatured";
import { MV_OUTLINE_BUTTON } from "./maidenVoyageLayoutStyles";

export function GenesisMaidenVoyagePageHeader() {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-[#FF8A7A]" aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/85">
          Maiden Voyage 2.0
        </span>
      </div>
      <a
        href={MAIDEN_VOYAGE_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={MV_OUTLINE_BUTTON}
      >
        <PlayCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
        How it works
      </a>
    </header>
  );
}
