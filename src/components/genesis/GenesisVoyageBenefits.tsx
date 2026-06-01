"use client";

import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MV_ICON_BADGE, MV_SECTION_LABEL } from "./maidenVoyageLayoutStyles";

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
    icon: SparklesIcon,
  },
] as const;

export function GenesisVoyageBenefits() {
  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className={`mb-3 ${MV_SECTION_LABEL}`}>What you&apos;ll receive</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BENEFITS.map(({ title, description, icon: Icon }) => (
          <div key={title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <span className={MV_ICON_BADGE}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-2 text-sm font-semibold text-white/90">{title}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/50">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
