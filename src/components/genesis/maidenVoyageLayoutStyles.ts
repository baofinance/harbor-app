import {
  BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";
import { HARBOR_FROSTED_LIGHT_CARD_ELEVATED, HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE } from "@/components/shared/harborFrostedSurfaceStyles";
import { HARBOR_THEME_CARD_SHADOW } from "@/components/shared/harborTheme";
import { HARBOR_BTN_GLASS_CORAL_DARK } from "@/components/shared/harborButtonStyles";

/** Shared Maiden Voyage 2.0 landing layout tokens (light refresh theme). */

/** Shared drop shadow for large cards and position rows. */
export const MV_GLASS_CARD_SHADOW = HARBOR_THEME_CARD_SHADOW;

/** Primary card / row surface on light canvas. */
export const MV_GLASS_INSET_LIGHT =
  `bg-white border border-harbor-blue/10 ${MV_GLASS_CARD_SHADOW}`;

/** Outer card shell. */
export const MV_GLASS_SURFACE = MV_GLASS_INSET_LIGHT;

/** Stat/KPI tile — subtle inset panel. */
export const MV_GLASS_INSET_DARK =
  "border border-harbor-blue/10 bg-[#F8FAFD] shadow-sm";

/** @deprecated Prefer MV_GLASS_INSET_LIGHT or MV_GLASS_INSET_DARK */
export const MV_GLASS_INSET = MV_GLASS_INSET_LIGHT;

/** Primary card shell. */
export const MV_CARD_SHELL = `rounded-2xl ${MV_GLASS_SURFACE}`;

/** Active voyage / primary campaign card — frosted glass with visible outline. */
export const MV_MAIN_CARD_SHELL = `rounded-2xl ${MV_GLASS_SURFACE}`;

export const MV_CARD_INNER_GRADIENT =
  "bg-gradient-to-b from-harbor-blue/[0.03] via-transparent to-transparent";

/** Stat/KPI tile shell. */
export const MV_STAT_TILE = `rounded-xl ${MV_GLASS_INSET_DARK}`;

/** @deprecated Use MV_STAT_TILE for stats; MV_POSITION_ROW for list rows */
export const MV_INSET_PANEL = MV_STAT_TILE;

/** Position/list row shell inside cards and explorer. */
export const MV_POSITION_ROW = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

export const MV_STATS_BAND =
  "border-y border-harbor-blue/10 bg-[#F8FAFD]";

/** Active voyage card stage strip. */
export const MV_FOOTER_PANEL_SURFACE =
  "border-harbor-blue/10 bg-[#F4F7FB]";

export const MV_FOOTER_PANEL =
  `border-t ${MV_FOOTER_PANEL_SURFACE}`;

/** Coming soon preview veil. */
export const MV_COMING_SOON_VEIL_CLASS =
  "pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-white/55 backdrop-blur-[2px]";

export const MV_COMING_SOON_OVERLAY_CLASS =
  "absolute inset-0 z-[2] flex cursor-not-allowed items-center justify-center";

export const MV_COMING_SOON_LABEL_CLASS =
  "rounded-full border border-harbor-blue/15 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wider text-harbor-blue shadow-lg";

export const MV_COMING_SOON_CONTENT_DIM_CLASS =
  "relative z-0 flex min-h-0 flex-1 flex-col saturate-[0.88] brightness-[0.96]";

export const MV_MUTED_TEXT = "text-harbor-blue/75";

/** Section and metric column labels. */
export const MV_SECTION_LABEL =
  "text-xs font-medium tracking-wide text-harbor-blue/65";

/** Secondary body copy on panels. */
export const MV_BODY_TEXT = "text-sm leading-relaxed text-harbor-blue/80";

/** Small captions under metrics and list items (12px minimum). */
export const MV_CAPTION_TEXT = "text-xs leading-relaxed text-harbor-blue/70";

/** Footnotes and tertiary hints. */
export const MV_META_TEXT = "text-xs leading-snug text-harbor-blue/55";

/** Stage strip — active stage callout. */
export const MV_STAGE_ACTIVE_TEXT = "text-xs font-medium text-harbor-blue/70";

/** Stage strip — step labels and node chrome. */
export const MV_STAGE_STEP_TEXT = "text-xs font-medium tracking-wide";

/** Subtle shadow for small text (legacy — light theme uses flat type). */
export const MV_TEXT_ON_GLASS = "";

export const MV_HEADLINE = "font-mono font-bold leading-[1.1]";

/** Scales with hero column width so the primary line stays on one row. */
export const MV_HEADLINE_SIZE =
  "text-[length:clamp(1.0625rem,calc(100cqi/15),3.5rem)]";

/** Centered stat columns in the active voyage metrics row (horizontal + vertical). */
export const MV_METRIC_STAT_COLUMN = "text-center";

export const MV_HEADLINE_PRIMARY = `block whitespace-nowrap text-harbor-blue ${MV_HEADLINE_SIZE}`;

/** Hero accent line — orange → pink gradient (mockup). */
export const MV_ACCENT_GRADIENT = "mv-text-accent-gradient";

export const MV_HEADLINE_ACCENT = `mt-1 block whitespace-nowrap ${MV_HEADLINE_SIZE} ${MV_ACCENT_GRADIENT}`;

/** Scales with hero column width so the subhead stays on one row. */
export const MV_SUBHEAD_SIZE =
  "text-[length:clamp(0.8125rem,calc(100cqi/29),1.125rem)]";

export const MV_SUBHEAD =
  `mt-4 font-medium leading-snug text-harbor-blue/75 whitespace-nowrap ${MV_SUBHEAD_SIZE}`;

export const MV_SUBHEAD_ACCENT = "text-harbor-coral";

export const MV_PROGRESS_TRACK =
  "h-4 overflow-hidden rounded-full border border-harbor-blue/12 bg-harbor-blue/[0.06]";

export const MV_PROGRESS_FILL =
  "h-full rounded-full bg-gradient-to-r from-harbor-coral to-[#ffb4a8] transition-[width]";

export const MV_PROGRESS_FILL_COMPLETE =
  "h-full rounded-full bg-[#4A9784] transition-[width]";

export const MV_PRIMARY_CTA = `w-full rounded-xl px-4 py-3 text-sm ${HARBOR_BTN_GLASS_CORAL_DARK}`;

export const MV_OUTLINE_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-harbor-blue/15 bg-white px-4 py-2 text-sm font-semibold text-harbor-blue transition hover:border-harbor-blue/25 hover:bg-[#F8FAFD]";

export const MV_TYPE_TAG =
  "rounded-full border border-harbor-blue/12 bg-harbor-blue/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-harbor-blue/80";

export const MV_LIVE_BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-harbor-coral/40 bg-harbor-coral/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-harbor-coral shadow-[0_0_20px_-4px_rgba(255,138,122,0.35)]";

/** Lifecycle pills — match Sail Long / Short direction chips (icon replaces dot). */
const MV_LIFECYCLE_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[0.03em]";

export const MV_COMPLETED_PILL = `${MV_LIFECYCLE_PILL_BASE} ${BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS}`;

export const MV_ARCHIVED_PILL = `${MV_LIFECYCLE_PILL_BASE} ${BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS}`;

/** Uniform vertical gap between right-rail cards (steps, why join, rewards). */
export const MV_SIDEBAR_STACK = "flex flex-col gap-4 lg:gap-6";

/** Icon badge shells on light cards. */
const MV_ICON_BADGE_BASE =
  `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE}`;

/** Primary MV coral badge (TIDE `DASHBOARD_PRODUCT_ICON_MV_CLASS`). */
export const MV_ICON_BADGE = `${MV_ICON_BADGE_BASE} h-8 w-8 border-harbor-coral/25 text-harbor-coral`;

/** Step / header icons — flywheel-sized shell (TIDE `TIDE_FLYWHEEL_ICON_BADGE` dimensions, MV coral). */
export const MV_ICON_BADGE_LG = `${MV_ICON_BADGE_BASE} h-9 w-9 border-harbor-coral/25 text-harbor-coral`;

/** Compact list-row benefit icons (What you receive). */
export const MV_ICON_BADGE_SM = `${MV_ICON_BADGE_BASE} h-7 w-7 border-harbor-coral/25 text-harbor-coral`;

/** Earn / checklist badges (TIDE `DASHBOARD_PRODUCT_ICON_EARN_CLASS`). */
export const MV_ICON_BADGE_EARN = `${MV_ICON_BADGE_BASE} h-8 w-8 border-harbor-mint/25 bg-harbor-mint/8 text-harbor-mint`;

export const MV_ICON_BADGE_EARN_SM = `${MV_ICON_BADGE_BASE} h-7 w-7 border-harbor-mint/25 bg-harbor-mint/8 text-harbor-mint`;

/** Neutral footer / explainer badges. */
export const MV_ICON_BADGE_NEUTRAL = `${MV_ICON_BADGE_BASE} h-8 w-8 border-harbor-blue/15 text-harbor-blue/45`;

/** Benchmark card icon shell — light frosted tile (Tide flywheel style). */
export const MV_ICON_BADGE_BENCHMARK = `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 sm:h-9 sm:w-9`;

export const MV_DETAILS_PANEL = MV_POSITION_ROW;

export const MV_GLASS_HOVER = "transition hover:bg-[#FAFBFD] hover:border-harbor-blue/15";

export const MV_TABLE_HEADER =
  "hidden md:grid gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-harbor-blue/50 lg:text-[11px]";

export const MV_TABLE_ROW = `grid grid-cols-1 gap-3 px-3 py-3 md:items-center md:gap-3 md:py-2.5 ${MV_POSITION_ROW}`;

export const MV_EXPLORER_TABS =
  "inline-flex rounded-full border border-harbor-blue/12 bg-harbor-blue/[0.04] p-0.5";

export const MV_EXPLORER_TAB_ACTIVE =
  "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-harbor-blue shadow-sm border border-harbor-blue/10";

export const MV_EXPLORER_TAB_INACTIVE =
  "rounded-full px-3 py-1.5 text-xs font-semibold text-harbor-blue/55 transition hover:text-harbor-blue/80";

export const MV_UPCOMING_BADGE =
  "inline-flex items-center rounded-full border border-[#5B8FD4]/40 bg-[#5B8FD4]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9EC5F5]";

/** Explore the Upside — ownership focal panel glow. */
export const MV_UPSIDE_OWNERSHIP_GLOW =
  "shadow-[0_0_40px_-12px_rgba(255,138,122,0.35)]";

/** Explore the Upside — elevated ownership shell (horizontal bar). */
export const MV_UPSIDE_OWNERSHIP_PANEL =
  "relative overflow-hidden rounded-xl border border-harbor-coral/25 bg-gradient-to-r from-harbor-coral/[0.06] via-white to-[#F8FAFD]";

/** Ownership bar sparkle icon tile. */
export const MV_UPSIDE_OWNERSHIP_ICON = MV_ICON_BADGE_LG;

/** White frosted shell for upside benchmark tiles. */
export const MV_UPSIDE_LIGHT_CARD_SHELL = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

/** Deposit row shell — dark stat tile glass (Explore the Upside). */
export const MV_UPSIDE_DEPOSIT_PANEL = `${MV_STAT_TILE} px-3 py-3 sm:px-4 sm:py-4`;

/** Labels on dark upside deposit panel. */
export const MV_UPSIDE_DEPOSIT_LABEL = MV_SECTION_LABEL;

/** Labels on white upside benchmark cards. */
export const MV_UPSIDE_LIGHT_LABEL =
  "text-xs font-medium tracking-wide text-[#1E4775]/65";

/** Growth-stage benchmark themes (Launch / Growth / Scale) — light card variants. */
export const MV_UPSIDE_STAGE_LAUNCH = {
  badge:
    "border-[#4A9784]/40 bg-[#4A9784]/12 text-[#2d6b5c]",
  earnings: "text-[#2d6b5c]",
  icon: "border-[#4A9784]/25 text-[#4A9784]",
  iconBenchmark: "border-[#4A9784]/25 text-[#4A9784]",
  hover: "hover:border-[#4A9784]/30",
  accentBar: "border-l-[3px] border-l-[#4A9784]",
} as const;

export const MV_UPSIDE_STAGE_GROWTH = {
  badge:
    "border-[#7C3AED]/35 bg-[#7C3AED]/10 text-[#5b21b6]",
  earnings: "text-[#5b21b6]",
  icon: "border-harbor-purple/25 text-harbor-purple",
  iconBenchmark: "border-harbor-purple/25 text-harbor-purple",
  hover: "hover:border-[#7C3AED]/30",
  accentBar: "border-l-[3px] border-l-[#7C3AED]",
} as const;

export const MV_UPSIDE_STAGE_SCALE = {
  badge:
    "border-[#1E4775]/30 bg-[#1E4775]/8 text-[#1E4775]",
  earnings: "text-[#1E4775]",
  icon: "border-harbor-blue/25 text-harbor-blue",
  iconBenchmark: "border-harbor-blue/25 text-harbor-blue",
  hover: "hover:border-[#5B8FD4]/30",
  accentBar: "border-l-[3px] border-l-[#5B8FD4]",
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
export const MV_UPSIDE_EXPLAINER_ICON = MV_ICON_BADGE_NEUTRAL;

/** Revenue share % — same accent gradient as hero headlines. */
export const MV_UPSIDE_OWNERSHIP_TEXT = MV_ACCENT_GRADIENT;

/** Potential earnings estimates in benchmark cards. */
export const MV_UPSIDE_EARNINGS_TEXT = "text-[#2d6b5c]";

/** TVL, revenue range, and other tertiary upside metadata. */
export const MV_UPSIDE_NEUTRAL_META =
  "text-[10px] font-medium uppercase tracking-wide text-harbor-blue/45";

/** Deposit input focus. */
export const MV_UPSIDE_DEPOSIT_INPUT_FOCUS =
  "focus:border-harbor-coral/30 focus:ring-harbor-coral/20";

/** Quick-select deposit preset chips. */
export const MV_UPSIDE_DEPOSIT_CHIP =
  "shrink-0 rounded-lg border border-harbor-blue/12 bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-harbor-blue/75 transition-colors hover:border-harbor-coral/30 hover:bg-harbor-coral/[0.06] hover:text-harbor-blue";

export const MV_UPSIDE_DEPOSIT_CHIP_ACTIVE =
  "border-harbor-coral/45 bg-harbor-coral/[0.12] text-harbor-blue shadow-[0_0_16px_-8px_rgba(255,138,122,0.35)]";

/** Brief highlight when ownership recalculates. */
export const MV_UPSIDE_OWNERSHIP_FLASH =
  "ring-1 ring-[#FF8A7A]/40 shadow-[0_0_48px_-10px_rgba(255,138,122,0.45)]";

/** Benchmark outcome tiles — white frosted glass (matches Your deposit row). */
export const MV_UPSIDE_BENCHMARK_TILE = `${MV_UPSIDE_LIGHT_CARD_SHELL} transition-all duration-200 hover:-translate-y-px hover:shadow-md`;

export const MV_UPSIDE_BENCHMARK_TILE_UPDATED =
  "ring-1 ring-harbor-mint/30 shadow-[0_0_24px_-12px_rgba(74,151,132,0.45)]";

/** Final growth-stage benchmark tile accent. */
export const MV_UPSIDE_BENCHMARK_TILE_DESTINATION =
  "border-[#B8EBD5]/15";
