/**
 * Dashboard typography tokens — Phase 1 readability polish.
 * Dashboard-only; does not modify shared Maiden Voyage globals.
 */

// Position rows (white index-style bars)
export const DASHBOARD_POSITION_TITLE_CLASS =
  "truncate text-sm font-bold leading-snug text-[#1E4775] sm:text-base";

export const DASHBOARD_POSITION_SUBTITLE_CLASS =
  "truncate text-xs leading-snug text-[#1E4775]/70";

export const DASHBOARD_POSITION_METRIC_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/55";

// Section accordion headers (REVENUE SHARE, EARN, …)
export const DASHBOARD_SECTION_HEADER_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-normal text-white/80";

// Numeric hierarchy
export const DASHBOARD_NUMERIC_HERO_CLASS =
  "font-mono text-4xl font-bold tabular-nums leading-none text-white sm:text-5xl lg:text-[3.25rem]";

export const DASHBOARD_NUMERIC_CHIP_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white";

export const DASHBOARD_NUMERIC_CHIP_PRIMARY_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-[#F5D76E]";

export const DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS =
  "font-mono text-base font-bold tabular-nums text-[#1E4775]";

export const DASHBOARD_NUMERIC_ROW_SECONDARY_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base";

// Activity feed
export const DASHBOARD_ACTIVITY_TIMESTAMP_CLASS =
  "text-[11px] font-normal leading-snug text-white/40 tabular-nums";

export const DASHBOARD_ACTIVITY_TITLE_CLASS =
  "text-sm font-semibold leading-snug text-white/95";

// Hero supporting copy
export const DASHBOARD_HERO_SUPPORTING_CLASS = "text-xs text-white/45";

export const DASHBOARD_HERO_LABEL_CLASS =
  "text-xs font-medium tracking-wide text-white/55";
