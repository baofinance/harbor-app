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

function StepColumn({
  step,
  icon: Icon,
  title,
  body,
}: (typeof STEPS)[number]) {
  return (
    <li className="flex flex-col items-center text-center">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#FF8A7A]/35 bg-[#FF8A7A]/10 font-mono text-xs font-bold text-[#FFE8E2]">
        {step}
      </span>
      <span className={`mt-2 ${MV_ICON_BADGE}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-2 text-sm font-semibold text-white/90">{title}</h2>
      <p className="mt-1 min-h-[2.5rem] max-w-[11rem] text-xs leading-relaxed text-white/50">
        {body}
      </p>
    </li>
  );
}

export function GenesisHowItWorksSteps() {
  return (
    <div className="mt-6">
      <ol className="flex flex-col gap-6 md:hidden">
        {STEPS.map((step) => (
          <StepColumn key={step.title} {...step} />
        ))}
      </ol>
      <ol
        className="hidden md:grid md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] md:items-center md:gap-x-1"
        aria-label="How Maiden Voyage works"
      >
        <StepColumn {...STEPS[0]} />
        <span
          className="flex items-center justify-center text-lg text-white/25"
          aria-hidden
        >
          →
        </span>
        <StepColumn {...STEPS[1]} />
        <span
          className="flex items-center justify-center text-lg text-white/25"
          aria-hidden
        >
          →
        </span>
        <StepColumn {...STEPS[2]} />
      </ol>
    </div>
  );
}
