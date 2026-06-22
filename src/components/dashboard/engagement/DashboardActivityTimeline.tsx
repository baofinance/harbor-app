"use client";

import type { TimelineEvent, TimelineEventKind } from "./dashboardEngagementUtils";
import {
  DASHBOARD_ACTIVITY_TIMESTAMP_CLASS,
  DASHBOARD_ACTIVITY_TITLE_CLASS,
} from "../dashboardTypography";
import {
  DASHBOARD_ACTIVITY_INSET_PANEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
} from "./engagementStyles";

export type DashboardActivityTimelineProps = {
  events: TimelineEvent[];
  isConnected: boolean;
};

function eventAccentClass(kind: TimelineEventKind): string {
  switch (kind) {
    case "revenue":
      return "border-l-[#F5D76E]/45";
    case "deposit":
      return "border-l-[#B8EBD5]/45";
    case "voyage":
      return "border-l-[#FF8A7A]/45";
    case "archived":
      return "border-l-white/18";
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
    <section className={DASHBOARD_ACTIVITY_INSET_PANEL_CLASS} aria-label="Recent activity">
      {events.length === 0 ? (
        <p className={ENGAGEMENT_MUTED_CLASS}>
          Your portfolio events will appear here as you deposit, earn revenue, and
          complete voyages.
        </p>
      ) : (
        <ul className="space-y-0">
          {events.map((e, i) => (
            <li
              key={e.id}
              className={`flex gap-3 border-l-[3px] py-2 pl-2.5 ${eventAccentClass(e.kind)} ${
                i < events.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
            >
              <div className="w-16 shrink-0">
                <p className={DASHBOARD_ACTIVITY_TIMESTAMP_CLASS}>{e.relativeLabel}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className={DASHBOARD_ACTIVITY_TITLE_CLASS}>{e.label}</p>
                <p className={ENGAGEMENT_MUTED_CLASS}>{e.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
