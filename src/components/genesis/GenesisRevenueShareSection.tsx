"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import {
  MAIDEN_VOYAGE_DOCS_LINKS,
  MAIDEN_VOYAGE_REVENUE_SHARE_BULLETS,
} from "@/config/maidenVoyageEducation";
import { MV_ICON_BADGE_EARN_SM } from "./maidenVoyageLayoutStyles";

export function GenesisRevenueShareSection() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-sm font-semibold text-white/90">
        Why participate in Maiden Voyage?
      </h2>
      <p className="mt-1 text-xs text-white/50">
        Help launch a market. Share in what it earns.
      </p>
      <ul className="mt-3 space-y-2">
        {MAIDEN_VOYAGE_REVENUE_SHARE_BULLETS.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2.5 text-xs leading-relaxed text-white/65"
          >
            <span className={`mt-0.5 ${MV_ICON_BADGE_EARN_SM}`} aria-hidden>
              <CheckIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            {bullet}
          </li>
        ))}
      </ul>
      <a
        href={MAIDEN_VOYAGE_DOCS_LINKS.base}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
      >
        Learn more about revenue share
      </a>
    </div>
  );
}
