"use client";

import type { TimelineEvent, TimelineEventKind } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagementStyles";

export type DashboardActivityTimelineProps = {
  events: TimelineEvent[];
  isConnected: boolean;
};

function eventAccentClass(kind: TimelineEventKind): string {
  switch (kind) {
    case "revenue":
      return "border-l-[#F5D76E]/70";
    case "deposit":
      return "border-l-[#B8EBD5]/70";
    case "voyage":
      return "border-l-[#FF8A7A]/70";
    case "archived":
      return "border-l-white/25";
    default:
      return "border-l-white/15";
  }
}

export function DashboardActivityTimeline({
  events,
  isConnected,
}: DashboardActivityTimelineProps) {
  if (!isConnected) return null;

  return (
    <section className={ENGAGEMENT_CARD_CLASS} aria-label="Recent activity">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Recent activity</p>
      {events.length === 0 ? (
        <p className={`${ENGAGEMENT_MUTED_CLASS} mt-3`}>
          Your portfolio events will appear here as you deposit, earn revenue, and
          complete voyages.
        </p>
      ) : (
        <ul className="mt-3 space-y-0">
          {events.map((e, i) => (
            <li
              key={e.id}
              className={`flex gap-3 border-l-[3px] py-2.5 pl-2.5 ${eventAccentClass(e.kind)} ${
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
