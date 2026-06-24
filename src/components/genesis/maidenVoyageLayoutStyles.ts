import {
  BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";

/** Shared Maiden Voyage 2.0 landing layout tokens (dark campaign theme). */

/** Shared drop shadow for large cards and borderless position rows. */
export const MV_GLASS_CARD_SHADOW =
  "shadow-[0_8px_32px_-10px_rgba(0,0,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.1)]";

/** Lighter frosted glass for position/list rows and large cards — borderless with card shadow. */
export const MV_GLASS_INSET_LIGHT =
  `bg-white/[0.11] backdrop-blur-md ${MV_GLASS_CARD_SHADOW}`;

/** Outer card glass — same borderless frost as voyage rows. */
export const MV_GLASS_SURFACE = MV_GLASS_INSET_LIGHT;

/** Unified stat/KPI tile glass — matches dashboard stat chips. */
export const MV_GLASS_INSET_DARK =
  "border border-white/[0.08] bg-[#122a47]/46 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/** @deprecated Prefer MV_GLASS_INSET_LIGHT or MV_GLASS_INSET_DARK */
export const MV_GLASS_INSET = MV_GLASS_INSET_LIGHT;

/** Primary card shell. */
export const MV_CARD_SHELL = `rounded-2xl ${MV_GLASS_SURFACE}`;

/** Active voyage / primary campaign card — frosted glass with visible outline. */
export const MV_MAIN_CARD_SHELL = `rounded-2xl ${MV_GLASS_SURFACE}`;

export const MV_CARD_INNER_GRADIENT =
  "bg-gradient-to-b from-white/[0.03] via-transparent to-transparent";

/** Stat/KPI tile shell. */
export const MV_STAT_TILE = `rounded-xl ${MV_GLASS_INSET_DARK}`;

/** @deprecated Use MV_STAT_TILE for stats; MV_POSITION_ROW for list rows */
export const MV_INSET_PANEL = MV_STAT_TILE;

/** Position/list row shell inside cards and explorer. */
export const MV_POSITION_ROW = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

export const MV_STATS_BAND =
  "border-y border-white/[0.08] bg-[#0a1929]/40 backdrop-blur-lg";

/** Active voyage card stage strip — darker inset at card bottom. */
export const MV_FOOTER_PANEL =
  "border-t border-white/[0.08] bg-[#0a1929]/55 backdrop-blur-md";

export const MV_MUTED_TEXT = "text-white/75";

/** Section and metric column labels. */
export const MV_SECTION_LABEL =
  "text-xs font-medium tracking-wide text-white/70";

/** Secondary body copy on glass panels. */
export const MV_BODY_TEXT = "text-sm leading-relaxed text-white/80";

/** Small captions under metrics and list items (12px minimum). */
export const MV_CAPTION_TEXT = "text-xs leading-relaxed text-white/75";

/** Footnotes and tertiary hints. */
export const MV_META_TEXT = "text-xs leading-snug text-white/60";

/** Stage strip — active stage callout. */
export const MV_STAGE_ACTIVE_TEXT = "text-xs font-medium text-white/70";

/** Stage strip — step labels and node chrome. */
export const MV_STAGE_STEP_TEXT = "text-xs font-medium tracking-wide";

/** Subtle shadow for small text on frosted glass (use sparingly). */
export const MV_TEXT_ON_GLASS = "[text-shadow:0_1px_2px_rgba(0,0,0,0.22)]";

export const MV_HEADLINE = "font-mono font-bold leading-[1.1]";

/** Scales with hero column width so the primary line stays on one row. */
export const MV_HEADLINE_SIZE =
  "text-[length:clamp(1.0625rem,calc(100cqi/15),3.5rem)]";

/** Centered stat columns in the active voyage metrics row (horizontal + vertical). */
export const MV_METRIC_STAT_COLUMN = "text-center";

export const MV_HEADLINE_PRIMARY = `block whitespace-nowrap text-white ${MV_HEADLINE_SIZE}`;

/** Hero accent line — orange → pink gradient (mockup). */
export const MV_ACCENT_GRADIENT = "mv-text-accent-gradient";

export const MV_HEADLINE_ACCENT = `mt-1 block whitespace-nowrap ${MV_HEADLINE_SIZE} ${MV_ACCENT_GRADIENT}`;

/** Scales with hero column width so the subhead stays on one row. */
export const MV_SUBHEAD_SIZE =
  "text-[length:clamp(0.8125rem,calc(100cqi/29),1.125rem)]";

export const MV_SUBHEAD =
  `mt-4 font-medium leading-snug text-white/75 whitespace-nowrap ${MV_SUBHEAD_SIZE} ${MV_TEXT_ON_GLASS}`;

export const MV_SUBHEAD_ACCENT = "text-[#FF8A7A]";

export const MV_PROGRESS_TRACK =
  "h-4 overflow-hidden rounded-full border border-white/12 bg-white/[0.08] backdrop-blur-sm";

export const MV_PROGRESS_FILL =
  "h-full rounded-full bg-gradient-to-r from-[#FF8A7A] to-[#ffb4a8] transition-[width]";

export const MV_PROGRESS_FILL_COMPLETE =
  "h-full rounded-full bg-[#4A9784] transition-[width]";

export const MV_PRIMARY_CTA =
  "w-full rounded-xl bg-gradient-to-r from-[#FF8A7A] to-[#ffb4a8] px-4 py-3 text-sm font-semibold text-[#1a0f0d] shadow-[0_8px_24px_-12px_rgba(255,138,122,0.65)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A7A]/40 disabled:cursor-not-allowed disabled:opacity-45";

export const MV_OUTLINE_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-white/22 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.1]";

export const MV_TYPE_TAG =
  "rounded-full border border-white/18 bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm";

export const MV_LIVE_BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-[#FF8A7A]/50 bg-[#FF8A7A]/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_0_20px_-4px_rgba(255,138,122,0.55)]";

/** Lifecycle pills — match Sail Long / Short direction chips (icon replaces dot). */
const MV_LIFECYCLE_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[0.03em]";

export const MV_COMPLETED_PILL = `${MV_LIFECYCLE_PILL_BASE} ${BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS}`;

export const MV_ARCHIVED_PILL = `${MV_LIFECYCLE_PILL_BASE} ${BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS}`;

/** Uniform vertical gap between right-rail cards (steps, why join, rewards). */
export const MV_SIDEBAR_STACK = "flex flex-col gap-4 lg:gap-6";

/** Step icon circles (Deposit, Market Launch, Claim & Earn). */
export const MV_ICON_BADGE =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a1929]/55 text-[#FF8A7A] backdrop-blur-md";

export const MV_ICON_BADGE_LG =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a1929]/55 text-[#FF8A7A] backdrop-blur-md";

/** Compact list-row benefit icons (What you receive). */
export const MV_ICON_BADGE_SM =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a1929]/55 text-[#FF8A7A] backdrop-blur-md";

export const MV_DETAILS_PANEL = MV_POSITION_ROW;

export const MV_GLASS_HOVER = "transition hover:bg-white/[0.14]";

export const MV_TABLE_HEADER =
  "hidden md:grid gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/45 lg:text-[11px]";

export const MV_TABLE_ROW = `grid grid-cols-1 gap-3 px-3 py-3 md:items-center md:gap-3 md:py-2.5 ${MV_POSITION_ROW}`;

export const MV_EXPLORER_TABS =
  "inline-flex rounded-full border border-white/12 bg-white/[0.08] p-0.5 backdrop-blur-md";

export const MV_EXPLORER_TAB_ACTIVE =
  "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1E4775]";

export const MV_EXPLORER_TAB_INACTIVE =
  "rounded-full px-3 py-1.5 text-xs font-semibold text-white/55 transition hover:text-white/80";

export const MV_UPCOMING_BADGE =
  "inline-flex items-center rounded-full border border-[#5B8FD4]/40 bg-[#5B8FD4]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9EC5F5]";

/** Explore the Upside — ownership focal panel glow. */
export const MV_UPSIDE_OWNERSHIP_GLOW =
  "shadow-[0_0_40px_-12px_rgba(255,138,122,0.35)]";

/** Explore the Upside — elevated ownership shell (horizontal bar). */
export const MV_UPSIDE_OWNERSHIP_PANEL =
  "relative overflow-hidden rounded-xl border border-[#FF8A7A]/25 bg-gradient-to-r from-[#FF8A7A]/[0.06] via-[#122a47]/55 to-[#0a1929]/40 backdrop-blur-md";

/** Ownership bar sparkle icon tile. */
export const MV_UPSIDE_OWNERSHIP_ICON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF8A7A]/30 bg-[#FF8A7A]/[0.12] text-[#FF8A7A]";

/** Deposit row shell. */
export const MV_UPSIDE_DEPOSIT_PANEL = `${MV_STAT_TILE} px-3 py-3 sm:px-4 sm:py-4`;

/** Growth-stage benchmark themes (Launch / Growth / Scale). */
export const MV_UPSIDE_STAGE_LAUNCH = {
  badge:
    "border-[#4A9784]/45 bg-[#4A9784]/10 text-[#4A9784]",
  earnings: "text-[#4A9784]",
  icon: "border-[#4A9784]/30 bg-[#4A9784]/10 text-[#4A9784]",
  hover: "hover:border-[#4A9784]/30 hover:bg-[#4A9784]/[0.04]",
  accentBar: "border-l-[3px] border-l-[#4A9784]",
} as const;

export const MV_UPSIDE_STAGE_GROWTH = {
  badge:
    "border-[#C4B5FD]/45 bg-[#C4B5FD]/10 text-[#C4B5FD]",
  earnings: "text-[#C4B5FD]",
  icon: "border-[#C4B5FD]/30 bg-[#C4B5FD]/10 text-[#C4B5FD]",
  hover: "hover:border-[#C4B5FD]/30 hover:bg-[#C4B5FD]/[0.04]",
  accentBar: "border-l-[3px] border-l-[#C4B5FD]",
} as const;

export const MV_UPSIDE_STAGE_SCALE = {
  badge:
    "border-[#5B8FD4]/45 bg-[#5B8FD4]/15 text-[#9EC5F5]",
  earnings: "text-[#9EC5F5]",
  icon: "border-[#5B8FD4]/30 bg-[#5B8FD4]/10 text-[#9EC5F5]",
  hover: "hover:border-[#5B8FD4]/30 hover:bg-[#5B8FD4]/[0.04]",
  accentBar: "border-l-[3px] border-l-[#9EC5F5]",
} as const;

export type UpsideGrowthStageId = "launch" | "growth" | "scale";

export const MV_UPSIDE_STAGE_BY_ID: Record<
  UpsideGrowthStageId,
  typeof MV_UPSIDE_STAGE_LAUNCH
> = {
  launch: MV_UPSIDE_STAGE_LAUNCH,
  growth: MV_UPSIDE_STAGE_GROWTH,
  scale: MV_UPSIDE_STAGE_SCALE,
};

/** Explainer footer icon tile. */
export const MV_UPSIDE_EXPLAINER_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/55";

/** Revenue share % — same accent gradient as hero headlines. */
export const MV_UPSIDE_OWNERSHIP_TEXT = MV_ACCENT_GRADIENT;

/** Potential earnings estimates in benchmark cards. */
export const MV_UPSIDE_EARNINGS_TEXT = "text-[#B8EBD5]";

/** TVL, revenue range, and other tertiary upside metadata. */
export const MV_UPSIDE_NEUTRAL_META =
  "text-[10px] font-medium uppercase tracking-wide text-white/45";

/** Deposit input focus — ties deposit row to ownership panel. */
export const MV_UPSIDE_DEPOSIT_INPUT_FOCUS =
  "focus:border-[#FF8A7A]/30 focus:ring-[#FF8A7A]/20";

/** Quick-select deposit preset chips. */
export const MV_UPSIDE_DEPOSIT_CHIP =
  "shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold tabular-nums text-white/75 transition-colors hover:border-[#FF8A7A]/30 hover:bg-[#FF8A7A]/[0.08] hover:text-white/90";

export const MV_UPSIDE_DEPOSIT_CHIP_ACTIVE =
  "border-[#FF8A7A]/45 bg-[#FF8A7A]/[0.14] text-white shadow-[0_0_16px_-8px_rgba(255,138,122,0.45)]";

/** Brief highlight when ownership recalculates. */
export const MV_UPSIDE_OWNERSHIP_FLASH =
  "ring-1 ring-[#FF8A7A]/40 shadow-[0_0_48px_-10px_rgba(255,138,122,0.45)]";

/** Benchmark outcome tile — hover + update feedback. */
export const MV_UPSIDE_BENCHMARK_TILE = `${MV_STAT_TILE} transition-all duration-200 hover:-translate-y-px`;

export const MV_UPSIDE_BENCHMARK_TILE_UPDATED =
  "border-[#B8EBD5]/25 bg-[#B8EBD5]/[0.05]";

/** Final growth-stage benchmark tile accent. */
export const MV_UPSIDE_BENCHMARK_TILE_DESTINATION =
  "border-[#B8EBD5]/15";
