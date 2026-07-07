"use client";

import {
  MAIDEN_VOYAGE_DOCS_LINKS,
  MAIDEN_VOYAGE_LIFECYCLE_STEPS,
} from "@/config/maidenVoyageEducation";
import { MV_ICON_BADGE_LG } from "./maidenVoyageLayoutStyles";

export function GenesisMaidenVoyageLifecycle() {
  return (
    <section className="mb-8" aria-labelledby="maiden-voyage-lifecycle-title">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="maiden-voyage-lifecycle-title"
          className="text-xs font-medium uppercase tracking-wider text-white/50"
        >
          How Maiden Voyage works
        </h2>
        <a
          href={MAIDEN_VOYAGE_DOCS_LINKS.base}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
        >
          Full guide
        </a>
      </div>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MAIDEN_VOYAGE_LIFECYCLE_STEPS.map(({ step, title, body }) => (
          <li
            key={step}
            className="relative rounded-xl border border-white/10 bg-white/5 px-4 py-4 sm:border-l-0 lg:border-l lg:first:border-l-0"
          >
            <span
              className={`mb-2 font-mono text-xs font-bold tabular-nums ${MV_ICON_BADGE_LG}`}
            >
              {step}
            </span>
            <h3 className="text-sm font-semibold text-white/90">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
