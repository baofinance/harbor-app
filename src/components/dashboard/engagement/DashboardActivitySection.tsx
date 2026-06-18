"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  DASHBOARD_SECTION_EXPAND_BTN_CLASS,
} from "../dashboardStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "../portfolio/portfolioStyles";

export type DashboardActivitySectionProps = {
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export function DashboardActivitySection({
  defaultExpanded = false,
  children,
}: DashboardActivitySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="Activity and progress"
    >
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 ${
          expanded ? "border-b border-white/[0.08]" : ""
        }`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center text-left hover:opacity-90"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <h2 className={MV_SECTION_LABEL}>Activity & progress</h2>
        </button>
        <button
          type="button"
          className={DASHBOARD_SECTION_EXPAND_BTN_CLASS}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse activity" : "Expand activity"}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDownIcon
            className={`${PORTFOLIO_CHEVRON_CLASS} ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      <div
        className={`${PORTFOLIO_ACCORDION_BODY_CLASS} ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2.5 px-3 pb-2.5 pt-2 sm:space-y-3 sm:px-4 sm:pb-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
