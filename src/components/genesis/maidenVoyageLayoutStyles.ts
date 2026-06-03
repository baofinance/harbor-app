/** Shared Maiden Voyage 2.0 landing layout tokens (dark campaign theme). */

/** Shared drop shadow for large cards and borderless position rows. */
export const MV_GLASS_CARD_SHADOW =
  "shadow-[0_8px_32px_-10px_rgba(0,0,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.1)]";

/** Outer card glass — lighter frost over page bg #1E4775. */
export const MV_GLASS_SURFACE =
  `border border-white/12 bg-[#2a5580]/38 backdrop-blur-xl ${MV_GLASS_CARD_SHADOW}`;

/** Lighter frosted glass for position/list rows — borderless with card shadow. */
export const MV_GLASS_INSET_LIGHT =
  `bg-white/[0.11] backdrop-blur-md ${MV_GLASS_CARD_SHADOW}`;

/** Unified stat/KPI tile glass — matches dashboard stat chips. */
export const MV_GLASS_INSET_DARK =
  "border border-white/[0.08] bg-[#122a47]/46 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/** @deprecated Prefer MV_GLASS_INSET_LIGHT or MV_GLASS_INSET_DARK */
export const MV_GLASS_INSET = MV_GLASS_INSET_LIGHT;

/** Primary card shell. */
export const MV_CARD_SHELL = `rounded-2xl ${MV_GLASS_SURFACE}`;

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

export const MV_FOOTER_PANEL =
  "border-t border-white/12 bg-white/[0.08] backdrop-blur-sm";

export const MV_MUTED_TEXT = "text-[#9AA5B8]";

export const MV_SECTION_LABEL =
  "text-xs font-medium uppercase tracking-wider text-white/55";

export const MV_HEADLINE = "font-mono font-bold leading-[1.1]";

/** Scales with hero column width so the primary line stays on one row. */
export const MV_HEADLINE_SIZE =
  "text-[length:clamp(0.875rem,5.5cqi,2.625rem)]";

export const MV_HEADLINE_PRIMARY = `block whitespace-nowrap text-white ${MV_HEADLINE_SIZE}`;

/** Hero accent line — orange → pink gradient (mockup). */
export const MV_ACCENT_GRADIENT =
  "bg-gradient-to-r from-[#FF8A7A] via-[#FF9A88] to-[#FFB4C8] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]";

export const MV_HEADLINE_ACCENT = `mt-1 block ${MV_HEADLINE_SIZE} ${MV_ACCENT_GRADIENT}`;

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

export const MV_COMPLETED_PILL =
  "inline-flex items-center gap-1 rounded-full border border-[#4A9784]/40 bg-[#4A9784]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B8EBD5]";

export const MV_ICON_BADGE =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FF8A7A]/30 bg-[#FF8A7A]/10 text-[#FF8A7A] backdrop-blur-sm";

export const MV_ICON_BADGE_LG =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#FF8A7A]/30 bg-[#FF8A7A]/10 text-[#FF8A7A] backdrop-blur-sm";

export const MV_DETAILS_PANEL = MV_POSITION_ROW;

export const MV_GLASS_HOVER = "transition hover:bg-white/[0.14]";

export const MV_COUNTDOWN_PANEL =
  "rounded-lg border border-[#FF8A7A]/22 bg-[#FF8A7A]/12 backdrop-blur-sm";

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
