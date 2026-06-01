"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MV_ICON_BADGE } from "./maidenVoyageLayoutStyles";

const STEPS = [
  {
    step: 1,
    icon: BanknotesIcon,
    title: "Deposit",
    body: "Add assets while capacity lasts.",
  },
  {
    step: 2,
    icon: SparklesIcon,
    title: "Launch",
    body: "Market launches when the cap is reached.",
  },
  {
    step: 3,
    icon: ArrowPathIcon,
    title: "Claim & Earn",
    body: "Claim Anchor + Sail tokens and earn revenue share forever.",
  },
] as const;

export function GenesisHowItWorksSteps() {
  return (
    <ol className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
      {STEPS.map(({ step, icon: Icon, title, body }, index) => (
        <li key={title} className="flex min-w-0 flex-1 items-start gap-2 sm:flex-col sm:items-center">
          {index > 0 ? (
            <span
              className="hidden shrink-0 self-center pt-6 text-lg text-white/25 sm:inline"
              aria-hidden
            >
              →
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:w-full">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#FF8A7A]/35 bg-[#FF8A7A]/10 font-mono text-xs font-bold text-[#FFE8E2]">
              {step}
            </span>
            <span className={`mt-2 ${MV_ICON_BADGE}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-2 text-sm font-semibold text-white/90">{title}</h2>
            <p className="mt-1 max-w-[11rem] text-xs leading-relaxed text-white/50">
              {body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
