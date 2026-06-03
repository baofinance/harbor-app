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
    <li className="flex w-[9.5rem] shrink-0 flex-col items-center text-center sm:w-[10.5rem]">
      <span className={MV_ICON_BADGE_LG}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-2 text-sm font-semibold text-white/95">{title}</h2>
      <p className={`mt-1 text-xs leading-snug ${MV_MUTED_TEXT}`}>{body}</p>
    </li>
  );
}

function StepArrow() {
  return (
    <span
      className="flex shrink-0 items-center self-center pb-8 text-base text-white/25 sm:text-lg"
      aria-hidden
    >
      →
    </span>
  );
}

export function GenesisHowItWorksSteps() {
  return (
    <div className="mt-5 md:mt-6">
      <ol className="flex flex-col items-center gap-4 md:hidden">
        {STEPS.map((step) => (
          <StepColumn key={step.title} {...step} />
        ))}
      </ol>
      <ol
        className="hidden md:flex md:items-start md:justify-center md:gap-1 lg:gap-2"
        aria-label="How Maiden Voyage works"
      >
        <StepColumn {...STEPS[0]} />
        <StepArrow />
        <StepColumn {...STEPS[1]} />
        <StepArrow />
        <StepColumn {...STEPS[2]} />
      </ol>
    </div>
  );
}
