"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { getActiveVoyageStatusLabel } from "@/utils/activeVoyageStatus";
import { MV_LIVE_BADGE } from "./maidenVoyageLayoutStyles";

const STATUS_STYLES: Record<
  ActiveVoyageStatus,
  { wrapper: string; dot?: boolean; pulse?: boolean; label?: string }
> = {
  deposits_open: {
    wrapper: MV_LIVE_BADGE,
    dot: true,
    pulse: true,
    label: "Live",
  },
  almost_full: {
    wrapper: MV_LIVE_BADGE,
    dot: true,
    label: "Live",
  },
  opening_soon: {
    wrapper: "border-white/20 bg-white/5 text-white/60",
  },
  capacity_reached: {
    wrapper: "border-[#9AA5B8]/40 bg-[#9AA5B8]/15 text-white/70",
  },
  preparing_launch: {
    wrapper: "border-white/20 bg-white/8 text-white/75",
  },
  launch_complete: {
    wrapper: "border-white/15 bg-white/5 text-white/60",
  },
  claim_available: {
    wrapper:
      "border-[#FF8A7A]/40 bg-[#FF8A7A]/15 text-[#FFE8E2]",
    dot: true,
  },
};

export type GenesisVoyageStatusBadgeProps = {
  status: ActiveVoyageStatus;
};

export function GenesisVoyageStatusBadge({ status }: GenesisVoyageStatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const label = style.label ?? getActiveVoyageStatusLabel(status);

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
