"use client";

import { WalletIcon } from "@heroicons/react/24/outline";

export function DashboardPageTitleSection() {
  return (
    <header className="mb-0 flex items-center gap-2">
      <WalletIcon className="h-5 w-5 text-[#FF8A7A]" aria-hidden />
      <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/85">
        Dashboard
      </span>
    </header>
  );
}
