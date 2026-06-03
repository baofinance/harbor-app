"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_ICON_BADGE,
  MV_ICON_BADGE_LG,
  MV_MUTED_TEXT,
} from "./maidenVoyageLayoutStyles";

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

export type GenesisHowItWorksStepsProps = {
  /** `hero` = standalone row under headline; `sidebarCard` = top-right card shell */
  variant?: "hero" | "sidebarCard";
};

function StepColumn({
  icon: Icon,
  title,
  body,
  compact = false,
}: (typeof STEPS)[number] & { compact?: boolean }) {
  return (
    <li
      className={`flex shrink-0 flex-col items-center text-center ${
        compact ? "w-[6.75rem] sm:w-[7.25rem]" : "w-[9.5rem] sm:w-[10.5rem]"
      }`}
    >
      <span className={compact ? MV_ICON_BADGE : MV_ICON_BADGE_LG}>
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
      </span>
      <h2
        className={`mt-2 font-semibold text-white/95 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-1 leading-snug ${MV_MUTED_TEXT} ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {body}
      </p>
    </li>
  );
}

function StepArrow({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center self-center text-white/25 ${
        compact ? "pb-7 text-sm" : "pb-8 text-base sm:text-lg"
      }`}
      aria-hidden
    >
      →
    </span>
  );
}

function StepsRow({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <StepColumn {...STEPS[0]} compact={compact} />
      <StepArrow compact={compact} />
      <StepColumn {...STEPS[1]} compact={compact} />
      <StepArrow compact={compact} />
      <StepColumn {...STEPS[2]} compact={compact} />
    </>
  );
}

export function GenesisHowItWorksSteps({
  variant = "hero",
}: GenesisHowItWorksStepsProps) {
  const compact = variant === "sidebarCard";

  const row = (
    <ol
      className={`flex items-start justify-center ${
        compact ? "gap-0.5 px-1 sm:gap-1" : "gap-1 lg:gap-2"
      }`}
      aria-label="How Maiden Voyage works"
    >
      <StepsRow compact={compact} />
    </ol>
  );

  if (variant === "sidebarCard") {
    return (
      <section
        className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-3 py-4 sm:px-4 sm:py-5`}
        aria-label="How Maiden Voyage works"
      >
        {row}
      </section>
    );
  }

  return (
    <div className="mt-5 md:mt-6">
      <ol className="flex flex-col items-center gap-4 md:hidden">
        {STEPS.map((step) => (
          <StepColumn key={step.title} {...step} />
        ))}
      </ol>
      <div className="hidden md:block">{row}</div>
    </div>
  );
}
