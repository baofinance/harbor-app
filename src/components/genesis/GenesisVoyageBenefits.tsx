"use client";

import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  MV_CAPTION_TEXT,
  MV_ICON_BADGE,
  MV_ICON_BADGE_SM,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

const BENEFITS = [
  {
    title: "Anchor Tokens",
    description: "Stable exposure to the market peg when it launches.",
    icon: BanknotesIcon,
  },
  {
    title: "Sail Tokens",
    description: "Leveraged exposure paired with your deposit share.",
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Yield Share Eligibility",
    description: "Earn a slice of market revenue for as long as you hold.",
    icon: CurrencyDollarIcon,
  },
  {
    title: "Founding Status",
    description: "Early depositor recognition on this maiden voyage.",
    icon: UserGroupIcon,
  },
] as const;

export function GenesisVoyageBenefits() {
  return <GenesisVoyageBenefitsWithLayout layout="grid" />;
}

export type GenesisVoyageBenefitsProps = {
  layout?: "grid" | "list" | "listFlat";
};

export function GenesisVoyageBenefitsWithLayout({
  layout = "grid",
}: GenesisVoyageBenefitsProps) {
  if (layout === "listFlat") {
    return (
      <div>
        <h3 className={`mb-3 ${MV_SECTION_LABEL}`}>What you receive</h3>
        <ul className="space-y-3">
          {BENEFITS.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex items-start gap-2.5">
              <span className={MV_ICON_BADGE_SM}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/90">{title}</p>
                <p className={MV_CAPTION_TEXT}>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className={`mb-3 ${MV_SECTION_LABEL}`}>What you receive</h3>
        <ul className="space-y-2.5">
          {BENEFITS.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex items-start gap-2.5">
              <span className={MV_ICON_BADGE_SM}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/90">{title}</p>
                <p className={MV_CAPTION_TEXT}>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className={`mb-3 ${MV_SECTION_LABEL}`}>What you&apos;ll receive</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BENEFITS.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center"
          >
            <span className={MV_ICON_BADGE}>
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-2 text-sm font-semibold text-white/90">{title}</p>
            <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
