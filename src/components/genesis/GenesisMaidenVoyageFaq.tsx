"use client";

import { useState } from "react";
import {
  MAIDEN_VOYAGE_DOCS_LINKS,
  MAIDEN_VOYAGE_FAQ_ITEMS,
} from "@/config/maidenVoyageEducation";

const FAQ_ROW_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 text-left transition hover:bg-white/[0.07]";

export function GenesisMaidenVoyageFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="mb-8" aria-labelledby="maiden-voyage-faq-title">
      <h2
        id="maiden-voyage-faq-title"
        className="mb-4 text-xs font-medium uppercase tracking-wider text-white/50"
      >
        Common questions
      </h2>
      <div className="space-y-2">
        {MAIDEN_VOYAGE_FAQ_ITEMS.map(({ id, question, answer, showLearnMore }) => {
          const isOpen = openId === id;
          return (
            <div key={id}>
              <button
                type="button"
                className={`${FAQ_ROW_CLASS} min-h-[44px] px-4 py-3 sm:px-5`}
                onClick={() => setOpenId((prev) => (prev === id ? null : id))}
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-white/90">
                    {question}
                  </span>
                  <span className="shrink-0 text-white/45" aria-hidden>
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {isOpen ? (
                  <div className="mt-2 border-t border-white/10 pt-2 text-sm leading-relaxed text-white/65">
                    <p>{answer}</p>
                    {showLearnMore ? (
                      <a
                        href={MAIDEN_VOYAGE_DOCS_LINKS.base}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Learn more
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
      <a
        href={MAIDEN_VOYAGE_DOCS_LINKS.base}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs font-semibold text-white/45 hover:text-white/65"
      >
        Read full Maiden Voyage guide
      </a>
    </section>
  );
}
