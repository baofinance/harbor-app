"use client";

import type { Achievement } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagementStyles";

export type DashboardAchievementsProps = {
  achievements: Achievement[];
  isConnected: boolean;
};

export function DashboardAchievements({
  achievements,
  isConnected,
}: DashboardAchievementsProps) {
  if (!isConnected) return null;

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <section className={ENGAGEMENT_CARD_CLASS} aria-label="Achievements">
      <div className="flex items-baseline justify-between gap-2">
        <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Milestones</p>
        <p className={ENGAGEMENT_MUTED_CLASS}>
          {earnedCount} / {achievements.length}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
              a.earned ? "bg-white/[0.04]" : "opacity-45"
            }`}
          >
            <span className="text-base" aria-hidden>
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/90">{a.label}</p>
              {a.detail ? (
                <p className="text-[10px] text-white/50">{a.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
