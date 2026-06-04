"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_WHY_JOIN_BULLETS } from "@/config/maidenVoyageEducation";
import { MV_BODY_TEXT, MV_CARD_INNER_GRADIENT, MV_CARD_SHELL } from "./maidenVoyageLayoutStyles";

export function GenesisMaidenVoyageWhyJoinCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3 sm:px-6 sm:py-4 ${className}`}
      aria-label="Why join a Maiden Voyage"
    >
      <h3 className="text-sm font-semibold text-white/95">
        Why join a Maiden Voyage?
      </h3>
      <ul className="mt-2 space-y-1.5">
        {MAIDEN_VOYAGE_WHY_JOIN_BULLETS.map((bullet) => (
          <li key={bullet} className={`flex items-start gap-2 ${MV_BODY_TEXT}`}>
            <CheckCircleIcon
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4A9784]"
              aria-hidden
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
