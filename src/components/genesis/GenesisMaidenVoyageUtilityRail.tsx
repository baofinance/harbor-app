"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_WHY_JOIN_BULLETS } from "@/config/maidenVoyageEducation";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { GenesisMaidenVoyageKpiStrip } from "./GenesisMaidenVoyageKpiStrip";

export type GenesisMaidenVoyageUtilityRailProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageUtilityRail({
  stats,
}: GenesisMaidenVoyageUtilityRailProps) {
  return (
    <div className="space-y-3">
      <div className="block md:hidden">
        <GenesisMaidenVoyageKpiStrip stats={stats} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <h3 className="text-sm font-semibold text-white/90">
          Why join a Maiden Voyage?
        </h3>
        <ul className="mt-2 space-y-1.5">
          {MAIDEN_VOYAGE_WHY_JOIN_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-xs text-white/60">
              <CheckCircleIcon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4A9784]"
                aria-hidden
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
