"use client";

import {
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";
import type { WelcomeHighlights } from "./dashboardEngagementUtils";

export type DashboardWelcomeHeaderProps = {
  welcome: WelcomeHighlights;
  isConnected: boolean;
  isLoading?: boolean;
};

export function DashboardWelcomeHeader({
  welcome,
  isConnected,
  isLoading = false,
}: DashboardWelcomeHeaderProps) {
  if (!isConnected) {
    return (
      <header className="min-w-0 space-y-1">
        <h1 className="font-bold font-mono text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
          Harbor
        </h1>
        <p className="max-w-lg text-sm text-white/70 sm:text-base">
          Connect your wallet to see your earnings, voyages, and next steps.
        </p>
      </header>
    );
  }

  return (
    <header className="min-w-0 space-y-3" aria-label="Welcome">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
        Welcome back
      </p>
      <div className="space-y-2">
        <p className="text-base text-white/85 sm:text-lg">
          You&apos;ve earned{" "}
          <span className="font-mono font-semibold text-[#F5D76E]">
            {isLoading ? "…" : welcome.earnedLabel}
          </span>
          {welcome.boostLabel ? (
            <>
              {" "}
              · Your boost is now{" "}
              <span className="font-mono font-semibold text-white">{welcome.boostLabel}</span>
            </>
          ) : null}
        </p>
        {welcome.voyageOpen && welcome.voyageLabel ? (
          <p className={ENGAGEMENT_MUTED_CLASS}>
            A new maiden voyage is accepting deposits · {welcome.voyageLabel}
          </p>
        ) : null}
        {welcome.milestoneDaysLeft != null && welcome.milestoneDaysLeft > 0 ? (
          <p className={ENGAGEMENT_MUTED_CLASS}>
            Next boost milestone in {welcome.milestoneDaysLeft} days ·{" "}
            {welcome.nextMilestoneLabel}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <div>
          <p className={ENGAGEMENT_LABEL_CLASS}>Portfolio health</p>
          <p className={ENGAGEMENT_VALUE_CLASS}>{welcome.healthLabel}</p>
        </div>
      </div>
    </header>
  );
}
