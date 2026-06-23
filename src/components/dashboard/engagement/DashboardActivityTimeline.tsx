"use client";

import type { ComponentType } from "react";
import {
  ArchiveBoxIcon,
  ArrowDownCircleIcon,
  BanknotesIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { TimelineEvent, TimelineEventKind } from "./dashboardEngagementUtils";
import {
  DASHBOARD_ACTIVITY_ICON_CELL_CLASS,
  DASHBOARD_ACTIVITY_ROW_GRID_CLASS,
  DASHBOARD_ACTIVITY_TEXT_CELL_CLASS,
  DASHBOARD_ACTIVITY_TIMESTAMP_CELL_CLASS,
  DASHBOARD_ACTIVITY_TIMESTAMP_CLASS,
  DASHBOARD_ACTIVITY_TITLE_CLASS,
  DASHBOARD_ACTIVITY_VALUE_CELL_CLASS,
  DASHBOARD_ACTIVITY_VALUE_MUTED_CLASS,
  DASHBOARD_ACTIVITY_VALUE_POSITIVE_CLASS,
} from "../dashboardTypography";
import { DASHBOARD_INSET_ROW_SHELL_CLASS } from "../portfolio/portfolioStyles";
import { DASHBOARD_INSET_ROW_STACK_CLASS } from "../portfolio/portfolioStyles";
import { ENGAGEMENT_MUTED_CLASS } from "./engagementStyles";

export type DashboardActivityTimelineProps = {
  events: TimelineEvent[];
  isConnected: boolean;
};

type EventIconConfig = {
  Icon: ComponentType<{ className?: string }>;
  className: string;
};

function eventIconConfig(kind: TimelineEventKind): EventIconConfig {
  switch (kind) {
    case "revenue":
      return { Icon: BanknotesIcon, className: "h-5 w-5 text-[#F5D76E]" };
    case "deposit":
      return { Icon: ArrowDownCircleIcon, className: "h-5 w-5 text-[#B8EBD5]" };
    case "voyage":
      return { Icon: CheckCircleIcon, className: "h-5 w-5 text-[#FF8A7A]" };
    case "archived":
      return { Icon: ArchiveBoxIcon, className: "h-5 w-5 text-white/40" };
    default:
      return { Icon: BanknotesIcon, className: "h-5 w-5 text-white/40" };
  }
}

function EventValue({ event }: { event: TimelineEvent }) {
  const valueClass = event.valueLabel
    ? event.valueTone === "positive"
      ? DASHBOARD_ACTIVITY_VALUE_POSITIVE_CLASS
      : DASHBOARD_ACTIVITY_VALUE_MUTED_CLASS
    : DASHBOARD_ACTIVITY_VALUE_MUTED_CLASS;

  return (
    <span className={`text-right ${valueClass}`}>
      {event.valueLabel ?? "—"}
    </span>
  );
}

function ActivityEventRow({ event }: { event: TimelineEvent }) {
  const { Icon, className: iconClass } = eventIconConfig(event.kind);

  return (
    <li className={`${DASHBOARD_INSET_ROW_SHELL_CLASS} ${DASHBOARD_ACTIVITY_ROW_GRID_CLASS}`}>
      <p className={`${DASHBOARD_ACTIVITY_TIMESTAMP_CLASS} ${DASHBOARD_ACTIVITY_TIMESTAMP_CELL_CLASS}`}>
        {event.relativeLabel}
      </p>
      <Icon
        className={`${iconClass} ${DASHBOARD_ACTIVITY_ICON_CELL_CLASS}`}
        aria-hidden
      />
      <div className={DASHBOARD_ACTIVITY_TEXT_CELL_CLASS}>
        <p className={DASHBOARD_ACTIVITY_TITLE_CLASS}>{event.label}</p>
        {event.detail ? (
          <p className={`truncate ${ENGAGEMENT_MUTED_CLASS}`}>{event.detail}</p>
        ) : null}
      </div>
      <div className={DASHBOARD_ACTIVITY_VALUE_CELL_CLASS}>
        <EventValue event={event} />
      </div>
    </li>
  );
}

export function DashboardActivityTimeline({
  events,
  isConnected,
}: DashboardActivityTimelineProps) {
  if (!isConnected) {
    return (
      <p className={ENGAGEMENT_MUTED_CLASS}>
        Connect your wallet to see recent activity.
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className={ENGAGEMENT_MUTED_CLASS}>
        Your portfolio events will appear here as you deposit, earn revenue, and
        complete voyages.
      </p>
    );
  }

  return (
    <ul className={DASHBOARD_INSET_ROW_STACK_CLASS} aria-label="Recent activity">
      {events.map((event) => (
        <ActivityEventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}
