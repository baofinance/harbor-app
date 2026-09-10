"use client";

import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_WHY_JOIN_BULLETS } from "@/config/maidenVoyageEducation";
import {
  SAIL_ADVANCED_FROSTED_CARD,
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_ADVANCED_SHELL,
} from "./genesisAdvancedStyles";

const HOW_IT_WORKS_STEPS = [
  {
    icon: WalletIcon,
    title: "Deposit",
    body: "Add assets while capacity lasts.",
  },
  {
    icon: ChartBarIcon,
    title: "Market Launch",
    body: "Once the cap is reached, the market goes live.",
  },
  {
    icon: ArrowPathIcon,
    title: "Claim & Earn",
    body: "Claim tokens and earn revenue share.",
  },
] as const;

const WHAT_YOU_RECEIVE = [
  {
    icon: BanknotesIcon,
    title: "Anchor Tokens",
    body: "Stable exposure to the market peg when it launches.",
  },
  {
    icon: ArrowTrendingUpIcon,
    title: "Sail Tokens",
    body: "Leveraged exposure paired with your deposit share.",
  },
  {
    icon: CurrencyDollarIcon,
    title: "Yield Share Eligibility",
    body: "Earn a slice of market revenue for as long as you hold.",
  },
  {
    icon: UserGroupIcon,
    title: "Founding Status",
    body: "Early depositor recognition on this maiden voyage.",
  },
] as const;

/** Earn/Sail-style education footer for Maiden Voyage. */
export function GenesisVoyageInfoFooter() {
  return (
    <footer className={`${SAIL_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Card 1 — How it works steps */}
        <div className={`${SAIL_ADVANCED_FROSTED_CARD} p-4 sm:p-5`}>
          <h3 className={`mb-3 ${SAIL_ADVANCED_LIGHT_SECTION_TITLE}`}>
            How it works
          </h3>
          <ol className="space-y-3">
            {HOW_IT_WORKS_STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E4775]/10 text-[#1E4775]">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1E4775]">
                    <span className="mr-1.5 text-[#1E4775]/40">{index + 1}.</span>
                    {title}
                  </p>
                  <p className={`mt-0.5 ${SAIL_ADVANCED_LIGHT_BODY}`}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Card 2 — Why join */}
        <div className={`${SAIL_ADVANCED_FROSTED_CARD} p-4 sm:p-5`}>
          <h3 className={`mb-3 ${SAIL_ADVANCED_LIGHT_SECTION_TITLE}`}>
            Why join a Maiden Voyage?
          </h3>
          <ul className="space-y-2.5">
            {MAIDEN_VOYAGE_WHY_JOIN_BULLETS.map((bullet) => (
              <li
                key={bullet}
                className={`flex items-start gap-2.5 ${SAIL_ADVANCED_LIGHT_BODY}`}
              >
                <CheckCircleIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#4A9784]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card 3 — What you receive */}
        <div className={`${SAIL_ADVANCED_FROSTED_CARD} p-4 sm:p-5`}>
          <h3 className={`mb-3 ${SAIL_ADVANCED_LIGHT_SECTION_TITLE}`}>
            What you receive
          </h3>
          <ul className="space-y-3">
            {WHAT_YOU_RECEIVE.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF8A7A]/15 text-[#D45A4A]">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1E4775]">{title}</p>
                  <p className={`mt-0.5 ${SAIL_ADVANCED_LIGHT_BODY}`}>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/65">
        <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
        Earn 5% of market revenue forever · Anchor + Sail at launch
      </p>
    </footer>
  );
}
