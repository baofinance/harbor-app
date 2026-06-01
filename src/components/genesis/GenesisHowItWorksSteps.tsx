"use client";

import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  INDEX_HERO_INTRO_BODY_CLASS,
  INDEX_HERO_INTRO_CARD_CLASS,
  INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS,
  INDEX_HERO_INTRO_ICON_CLASS,
  INDEX_HERO_INTRO_TITLE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

const STEPS = [
  {
    icon: BanknotesIcon,
    title: "Deposit",
    body: "Add assets while capacity lasts.",
    accent: false,
  },
  {
    icon: SparklesIcon,
    title: "Launch",
    body: "Market launches when the cap is reached.",
    accent: true,
  },
  {
    icon: ArrowPathIcon,
    title: "Claim & Earn",
    body: "Claim Anchor + Sail tokens and earn revenue share forever.",
    accent: false,
  },
] as const;

export function GenesisHowItWorksSteps() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, body, accent }) => (
        <div
          key={title}
          className={`${INDEX_HERO_INTRO_CARD_CLASS} ${
            accent ? INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS : ""
          }`}
        >
          <div className="mb-1 flex items-center justify-center gap-2">
            <Icon className={INDEX_HERO_INTRO_ICON_CLASS} />
            <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>{title}</h2>
          </div>
          <p className={INDEX_HERO_INTRO_BODY_CLASS}>{body}</p>
        </div>
      ))}
    </div>
  );
}
