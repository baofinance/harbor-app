"use client";

import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { DASHBOARD_SECTION_TITLE_CLASS } from "../dashboardTypography";
import type { TimelineEvent } from "./dashboardEngagementUtils";
import { DashboardActivityTimeline } from "./DashboardActivityTimeline";

const VISIBLE_EVENT_LIMIT = 5;

export type DashboardActivitySectionProps = {
  events: TimelineEvent[];
  isConnected: boolean;
};

export function DashboardActivitySection({
  events,
  isConnected,
}: DashboardActivitySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMore = events.length > VISIBLE_EVENT_LIMIT;
  const visibleEvents = expanded
    ? events
    : events.slice(0, VISIBLE_EVENT_LIMIT);

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="Recent Activity"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
        <h2 className={DASHBOARD_SECTION_TITLE_CLASS}>Recent Activity</h2>
        {isConnected && hasMore ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-white/55 transition-colors hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "View all"}
            <ChevronRightIcon
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      <div className="px-3 pb-2.5 pt-0 sm:px-4 sm:pb-3">
        <DashboardActivityTimeline events={visibleEvents} isConnected={isConnected} />
      </div>
    </section>
  );
}
