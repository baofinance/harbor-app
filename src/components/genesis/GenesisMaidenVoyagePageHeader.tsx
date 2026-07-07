"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { MV_ICON_BADGE } from "./maidenVoyageLayoutStyles";

export function GenesisMaidenVoyagePageHeader() {
  return (
    <header className="mb-0 flex items-center gap-2.5">
      <span className={MV_ICON_BADGE} aria-hidden>
        <SparklesIcon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/85">
        Maiden Voyage 2.0
      </span>
    </header>
  );
}
