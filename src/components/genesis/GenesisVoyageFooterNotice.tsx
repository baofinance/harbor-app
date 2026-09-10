"use client";

import Link from "next/link";
import { GenesisVoyageCompletedNotice } from "./GenesisVoyageCompletedNotice";

export function GenesisVoyageFooterNotice() {
  return (
    <footer className="mt-8">
      <GenesisVoyageCompletedNotice />
    </footer>
  );
}

/** Attribution line for under FAQ / page chrome. */
export function GenesisMaidenVoyageHarborAttribution({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p className={`text-center text-xs text-white/40 ${className}`.trim()}>
      Maiden Voyage 2.0 is part of the{" "}
      <Link
        href="/"
        className="font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
      >
        Harbor
      </Link>{" "}
      protocol.
    </p>
  );
}
