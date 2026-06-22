"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_BUTTON_CLASS,
} from "../dashboardStyles";
import { PORTFOLIO_MUTED_CLASS } from "../portfolio/portfolioStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "../portfolio/portfolioStyles";

export type DashboardActivitySectionProps = {
  defaultExpanded?: boolean;
  latestEvent?: { label: string; relativeLabel: string } | null;
  isConnected?: boolean;
  children: React.ReactNode;
};

export function DashboardActivitySection({
  defaultExpanded = false,
  latestEvent = null,
  isConnected = false,
  children,
}: DashboardActivitySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const previewText =
    isConnected && latestEvent
      ? `${latestEvent.label} · ${latestEvent.relativeLabel}`
      : isConnected
        ? "No recent events yet"
        : null;

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden ${
        !expanded ? DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS : ""
      }`}
      aria-label="Recent Activity"
    >
      <div
        className={`px-3 py-2 sm:px-4 sm:py-2.5 ${
          expanded ? "border-b border-white/[0.08]" : ""
        }`}
      >
        <button
          type="button"
          className={DASHBOARD_PRODUCT_CARD_HEADER_BUTTON_CLASS}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Recent Activity" : "Expand Recent Activity"}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className={MV_SECTION_LABEL}>Recent Activity</h2>
              {!expanded && previewText ? (
                <p className={`mt-0.5 truncate ${PORTFOLIO_MUTED_CLASS}`}>{previewText}</p>
              ) : null}
            </div>
            <ChevronDownIcon
              className={`${PORTFOLIO_CHEVRON_CLASS} pointer-events-none shrink-0 ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </div>
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
