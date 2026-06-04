"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";

export function GenesisMaidenVoyagePageHeader() {
  return (
    <header className="mb-0 flex items-center gap-2">
      <SparklesIcon className="h-5 w-5 text-[#FF8A7A]" aria-hidden />
      <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/85">
        Maiden Voyage 2.0
      </span>
    </header>
  );
}
