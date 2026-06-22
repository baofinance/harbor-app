"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Opportunity } from "./dashboardEngagementUtils";
import {
  DASHBOARD_ACTIVITY_INSET_PANEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagementStyles";

export type DashboardOpportunityPanelProps = {
  opportunities: Opportunity[];
  isConnected: boolean;
};

export function DashboardOpportunityPanel({
  opportunities,
  isConnected,
}: DashboardOpportunityPanelProps) {
  if (!isConnected || opportunities.length === 0) return null;

  return (
    <section className={DASHBOARD_ACTIVITY_INSET_PANEL_CLASS} aria-label="Suggested actions">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Suggested actions</p>
      <ul className="mt-2.5 space-y-1.5">
        {opportunities.map((op) => (
          <li key={op.id}>
            <OpportunityRow opportunity={op} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  const content = (
    <>
      <span className="text-base" aria-hidden>
        {opportunity.icon}
      </span>
      <span className="min-w-0 flex-1 text-sm text-white/90">{opportunity.label}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
    </>
  );

  const className = `flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
    opportunity.emphasis
      ? "border-[#F5D76E]/30 bg-[#F5D76E]/[0.06] hover:bg-[#F5D76E]/10"
      : "border-white/[0.08] bg-[#0a1929]/35 hover:bg-[#0a1929]/50"
  }`;

  if (opportunity.href) {
    return (
      <Link href={opportunity.href} className={className}>
        {content}
      </Link>
    );
  }

  if (opportunity.onClick) {
    return (
      <button type="button" className={className} onClick={opportunity.onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
