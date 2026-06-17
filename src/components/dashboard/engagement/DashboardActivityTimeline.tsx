"use client";

import type { TimelineEvent } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagementStyles";

export type DashboardActivityTimelineProps = {
  events: TimelineEvent[];
  isConnected: boolean;
};

export function DashboardActivityTimeline({
  events,
  isConnected,
}: DashboardActivityTimelineProps) {
  if (!isConnected) return null;

  return (
    <section className={ENGAGEMENT_CARD_CLASS} aria-label="Activity timeline">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Recent activity</p>
      {events.length === 0 ? (
        <p className={`${ENGAGEMENT_MUTED_CLASS} mt-3`}>
          Activity will appear here as you earn revenue and participate in voyages.
        </p>
      ) : (
        <ul className="mt-3 space-y-0">
          {events.map((e, i) => (
            <li
              key={e.id}
              className={`flex gap-3 py-2.5 ${
                i < events.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              <div className="w-16 shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {e.relativeLabel}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/90">{e.label}</p>
                <p className={ENGAGEMENT_MUTED_CLASS}>{e.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
