import { MAIDEN_VOYAGE_DOCS_URL } from "@/config/maidenVoyageFeatured";

export const MAIDEN_VOYAGE_DOCS_LINKS = {
  base: MAIDEN_VOYAGE_DOCS_URL,
} as const;

export type MaidenVoyageLifecycleStep = {
  step: number;
  title: string;
  body: string;
};

export const MAIDEN_VOYAGE_LIFECYCLE_STEPS: MaidenVoyageLifecycleStep[] = [
  {
    step: 1,
    title: "Deposit",
    body: "Add assets while voyage capacity is open.",
  },
  {
    step: 2,
    title: "Launch",
    body: "When the deposit cap is reached, the market launches.",
  },
  {
    step: 3,
    title: "Receive tokens",
    body: "Your deposit is converted into Anchor and Sail tokens for this market.",
  },
  {
    step: 4,
    title: "Earn revenue share",
    body: "Eligible deposits earn an ongoing share of fees and collateral yield from the market.",
  },
];

export const MAIDEN_VOYAGE_REVENUE_SHARE_BULLETS = [
  "You help bootstrap a new Harbor market with launch liquidity.",
  "In return, you become eligible for a share of revenue that market generates over time.",
  "Revenue comes from mint and redeem fees plus yield on the market collateral.",
  "Staying deposited in Harbor tokens after launch helps you keep benefiting from that share.",
] as const;

export const MAIDEN_VOYAGE_WHY_JOIN_BULLETS = [
  "Earn 5% of market revenue forever",
  "Permanent share, limited opportunity",
  "Anchor + Sail tokens at launch",
  "Boosted yield for early supporters",
] as const;

/** Explore the Upside section — narrative copy (Phase 1). */
export const MAIDEN_VOYAGE_UPSIDE_COPY = {
  sectionTitle: "Explore the Upside",
  sectionCaption:
    "See what your founding deposit could become as this market grows.",
  depositLabel: "Your deposit",
  revenueShareTitle: "Future Revenue Share",
  revenueShareCaption: "Your share of future market revenue",
  benchmarkIntro: "If this market grows, your share could earn…",
  youEarn: "You earn",
  youCouldEarn: "You could earn",
  marketRevenueSuffix: "market revenue",
  earningsSuffix: "/yr",
  explainerSubtitle:
    "See the assumptions and formulas behind these projections.",
  explainerToggleShow: "Show details",
  explainerToggleHide: "Hide details",
  sliderMinUsd: 500,
  sliderMaxUsd: 10_000,
  depositPresets: [500, 1_000, 5_000, 10_000] as const,
  growthStages: [
    { id: "launch", label: "Launch", tvlUsd: 100_000 },
    { id: "growth", label: "Growth", tvlUsd: 1_000_000 },
    { id: "scale", label: "Scale", tvlUsd: 10_000_000 },
  ],
} as const;

export type MaidenVoyageYieldRule = {
  id: string;
  label: string;
};

export const MAIDEN_VOYAGE_YIELD_RULES: MaidenVoyageYieldRule[] = [
  { id: "participant", label: "Launch participant" },
  { id: "eligible", label: "Revenue share eligible" },
  { id: "stay", label: "Stay deposited to maximize share" },
  { id: "withdraw", label: "Withdrawals reduce eligibility" },
];

export type MaidenVoyageFaqItem = {
  id: string;
  question: string;
  answer: string;
  showLearnMore?: boolean;
};

export const MAIDEN_VOYAGE_FAQ_ITEMS: MaidenVoyageFaqItem[] = [
  {
    id: "fills",
    question: "What happens when the voyage fills?",
    answer:
      "New deposits stop once capacity is reached. The voyage ends on-chain, the market launches, and you can claim your Anchor and Sail tokens when claim is available.",
    showLearnMore: true,
  },
  {
    id: "receive",
    question: "What do I receive after launch?",
    answer:
      "You receive Harbor Anchor and Sail tokens tied to this market—typically about half of your counted deposit in each, per the voyage rules. You can hold, trade, or redeem them through Harbor after launch.",
    showLearnMore: true,
  },
  {
    id: "yield-share",
    question: "How does Yield Share work?",
    answer:
      "A portion of this market revenue is credited to Maiden Voyage depositors. Your share is set when the voyage closes based on how much you had deposited. Holding Anchor and Sail for this market keeps you in the pool; selling or withdrawing can reduce what you earn.",
    showLearnMore: true,
  },
  {
    id: "withdraw",
    question: "What happens if I withdraw?",
    answer:
      "While the voyage is open, you may withdraw collateral through Manage if the contract allows it. After the voyage completes, deposits are locked until you claim tokens. Withdrawing before close can lower your counted deposit and revenue share.",
    showLearnMore: true,
  },
  {
    id: "claim-before",
    question: "Can I claim before launch?",
    answer:
      "No. Anchor and Sail tokens are claimable after the voyage has ended on-chain and the market has launched.",
    showLearnMore: true,
  },
  {
    id: "when-live",
    question: "When does the market go live?",
    answer:
      "The market launches after the deposit cap is filled and genesis ends. There may be a short period where deposits are closed but claim is not yet available—shown as Preparing Launch in the app.",
    showLearnMore: true,
  },
  {
    id: "deposit-after",
    question: "Can I deposit after launch?",
    answer:
      "No. Maiden Voyage deposits close when the voyage ends. After launch, use Anchor and Sail markets to participate in the live market.",
    showLearnMore: true,
  },
];
