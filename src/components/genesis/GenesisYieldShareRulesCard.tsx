"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import {
  MAIDEN_VOYAGE_DOCS_LINKS,
  MAIDEN_VOYAGE_YIELD_RULES,
} from "@/config/maidenVoyageEducation";
import { MV_ICON_BADGE_EARN_SM } from "./maidenVoyageLayoutStyles";

export type GenesisYieldShareRulesCardProps = {
  yieldRevSharePct: number | null;
};

export function GenesisYieldShareRulesCard({
  yieldRevSharePct,
}: GenesisYieldShareRulesCardProps) {
  const shareHint =
    yieldRevSharePct != null && yieldRevSharePct > 0
      ? `Depositors can earn up to ${yieldRevSharePct}% of this market revenue over time (per voyage rules).`
      : "Depositors can earn a share of this market revenue over time (per voyage rules).";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-sm font-semibold text-white/90">Yield Share rules</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/55">{shareHint}</p>
      <ul className="mt-3 space-y-2.5">
        {MAIDEN_VOYAGE_YIELD_RULES.map(({ id, label }) => (
          <li key={id} className="flex items-start gap-2.5 text-sm text-white/80">
            <span className={`mt-0.5 ${MV_ICON_BADGE_EARN_SM}`} aria-hidden>
              <CheckIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <a
        href={MAIDEN_VOYAGE_DOCS_LINKS.base}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
      >
        Yield share details
      </a>
    </div>
  );
}
