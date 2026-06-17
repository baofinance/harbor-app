"use client";

import { StatusBadge } from "../portfolio/StatusBadge";
import {
  ENGAGEMENT_ACCENT_CORAL,
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";

export type FoundingMarketsSnapshot = {
  joined: number;
  active: number;
  completed: number;
  markets: Array<{ label: string; status: "active" | "completed"; usd: number }>;
};

export type DashboardFoundingTrackerProps = {
  founding: FoundingMarketsSnapshot;
  isConnected: boolean;
};

export function DashboardFoundingTracker({
  founding,
  isConnected,
}: DashboardFoundingTrackerProps) {
  if (!isConnected || founding.joined === 0) return null;

  return (
    <section
      className={`${ENGAGEMENT_CARD_CLASS} relative overflow-hidden ${ENGAGEMENT_ACCENT_CORAL}`}
      aria-label="Founding positions"
    >
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Founding markets</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Joined" value={String(founding.joined)} />
        <Stat label="Active" value={String(founding.active)} />
        <Stat label="Completed" value={String(founding.completed)} />
      </div>

      <ul className="mt-4 space-y-2">
        {founding.markets.slice(0, 6).map((m) => (
          <li
            key={m.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#0a1929]/35 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/90">{m.label}</p>
              <p className={ENGAGEMENT_MUTED_CLASS}>Founding member</p>
            </div>
            <StatusBadge
              label={m.status === "active" ? "Active" : "Completed"}
              variant={m.status === "active" ? "green" : "neutral"}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={ENGAGEMENT_LABEL_CLASS}>{label}</p>
      <p className={ENGAGEMENT_VALUE_CLASS}>{value}</p>
    </div>
  );
}
