"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

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
    <ol className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
      {STEPS.map(({ step, icon: Icon, title, body }, index) => (
        <li key={title} className="flex min-w-0 flex-1 items-start gap-2 sm:flex-col sm:items-center sm:text-center">
          {index > 0 ? (
            <span
              className="hidden shrink-0 self-center text-lg text-white/25 sm:inline"
              aria-hidden
            >
              →
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:flex-col sm:items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#FF8A7A]/35 bg-[#FF8A7A]/10 font-mono text-xs font-bold text-[#FFE8E2]">
              {step}
            </span>
            <div className="min-w-0 flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5 sm:justify-center">
                <Icon className="h-4 w-4 shrink-0 text-[#FF8A7A]/80" aria-hidden />
                <h2 className="text-sm font-semibold text-white/90">{title}</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{body}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
