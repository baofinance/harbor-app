"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MV_ICON_BADGE_LG, MV_MUTED_TEXT } from "./maidenVoyageLayoutStyles";

const STEPS = [
  {
    icon: BanknotesIcon,
    title: "Deposit",
    body: "Add assets while capacity lasts.",
  },
  {
    icon: SparklesIcon,
    title: "Market Launch",
    body: "Once the cap is reached, the market goes live.",
  },
  {
    icon: ArrowPathIcon,
    title: "Claim & Earn",
    body: "Claim tokens and earn revenue share.",
  },
] as const;

function StepColumn({
  icon: Icon,
  title,
  body,
}: (typeof STEPS)[number]) {
  return (
    <li className="flex flex-col items-center text-center">
      <span className={MV_ICON_BADGE_LG}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-2 text-sm font-semibold text-white/95">{title}</h2>
      <p className={`mt-1 max-w-[11rem] text-xs leading-snug ${MV_MUTED_TEXT}`}>
        {body}
      </p>
    </li>
  );
}

export function GenesisHowItWorksSteps() {
  return (
    <div className="mt-3">
      <ol className="flex flex-col gap-4 md:hidden">
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
