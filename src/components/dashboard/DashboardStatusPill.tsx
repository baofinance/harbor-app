"use client";

import type { DashboardStatusTone } from "./dashboardRowPresentation";
import {
  DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
} from "./dashboardStyles";

export function DashboardStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: DashboardStatusTone;
}) {
  const className =
    tone === "ended"
      ? DASHBOARD_STATUS_PILL_ENDED_LIGHT
      : tone === "active"
        ? DASHBOARD_STATUS_PILL_ACTIVE_LIGHT
        : DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT;

  return <span className={className}>{label}</span>;
}
