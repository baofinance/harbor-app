"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { getActiveVoyageStatusLabel } from "@/utils/activeVoyageStatus";

const STATUS_STYLES: Record<
  ActiveVoyageStatus,
  { wrapper: string; dot?: boolean; pulse?: boolean }
> = {
  deposits_open: {
    wrapper:
      "border-[#4A9784]/40 bg-[#4A9784]/15 text-[#2d6b5c]",
    dot: true,
    pulse: true,
  },
  almost_full: {
    wrapper:
      "border-[#E8A84B]/40 bg-[#FFF4E3]/80 text-[#8a5a12]",
    dot: true,
  },
  opening_soon: {
    wrapper: "border-[#1E4775]/20 bg-[#1E4775]/8 text-[#1E4775]/70",
  },
  capacity_reached: {
    wrapper: "border-[#9AA5B8]/40 bg-[#9AA5B8]/15 text-[#5a6270]",
  },
  preparing_launch: {
    wrapper: "border-[#1E4775]/25 bg-[#1E4775]/10 text-[#1E4775]/75",
  },
  launch_complete: {
    wrapper: "border-[#1E4775]/20 bg-[#1E4775]/8 text-[#1E4775]/65",
  },
  claim_available: {
    wrapper:
      "border-[#FF8A7A]/40 bg-[#FF8A7A]/15 text-[#a84335]",
    dot: true,
  },
};

export type GenesisVoyageStatusBadgeProps = {
  status: ActiveVoyageStatus;
};

export function GenesisVoyageStatusBadge({ status }: GenesisVoyageStatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const label = getActiveVoyageStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${style.wrapper}`}
    >
      {style.dot ? (
        <span
          className={`h-2 w-2 shrink-0 rounded-full bg-current opacity-80 ${
            style.pulse ? "animate-pulse" : ""
          }`}
        />
      ) : null}
      {label}
    </span>
  );
}
