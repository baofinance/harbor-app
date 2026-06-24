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
  "font-mono text-sm font-semibold tabular-nums text-harbor-gold";

export const DASHBOARD_NUMERIC_ROW_PRIMARY_CLASS =
  "font-mono text-base font-bold tabular-nums text-[#1E4775]";

export const DASHBOARD_NUMERIC_ROW_SECONDARY_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-[#1E4775] sm:text-base";

// Activity feed
export const DASHBOARD_ACTIVITY_TIMESTAMP_CLASS =
  "text-[11px] font-normal leading-snug text-white/40 tabular-nums";

export const DASHBOARD_ACTIVITY_TITLE_CLASS =
  "text-sm font-semibold leading-snug text-white/95";

export const DASHBOARD_ACTIVITY_ROW_GRID_CLASS =
  "grid w-full grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1 sm:grid-cols-[4rem_auto_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-center sm:gap-x-3";

export const DASHBOARD_ACTIVITY_TIMESTAMP_CELL_CLASS =
  "col-start-1 row-start-1 sm:row-start-auto";

export const DASHBOARD_ACTIVITY_ICON_CELL_CLASS =
  "col-start-2 row-start-1 sm:col-start-2 sm:row-start-auto";

export const DASHBOARD_ACTIVITY_TEXT_CELL_CLASS =
  "col-span-3 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1";

export const DASHBOARD_ACTIVITY_VALUE_CELL_CLASS =
  "col-start-3 row-start-1 sm:col-start-4 sm:row-start-auto";

export const DASHBOARD_ACTIVITY_VALUE_POSITIVE_CLASS =
  "font-mono text-sm tabular-nums text-harbor-mint";

export const DASHBOARD_ACTIVITY_VALUE_MUTED_CLASS =
  "font-mono text-sm tabular-nums text-white/35";

// Section titles (product cards + activity)
export { DASHBOARD_PRODUCT_TITLE_CLASS as DASHBOARD_SECTION_TITLE_CLASS } from "./dashboardStyles";

// Hero supporting copy
export const DASHBOARD_HERO_SUPPORTING_CLASS = "text-xs text-white/45";

export const DASHBOARD_HERO_LABEL_CLASS =
  "text-xs font-medium tracking-wide text-white/55";

// Dark inset rows inside frosted product cards
export const DASHBOARD_INSET_TITLE_CLASS =
  "truncate text-sm font-semibold text-white/95";

export const DASHBOARD_INSET_SUBTITLE_CLASS =
  "truncate text-xs text-white/50";

export const DASHBOARD_INSET_METRIC_LABEL_CLASS = "text-sm text-white/50";

export const DASHBOARD_INSET_METRIC_VALUE_CLASS =
  "font-mono text-sm tabular-nums text-white/90";

export const DASHBOARD_INSET_METRIC_MUTED_CLASS =
  "font-mono text-sm tabular-nums text-white/40";

export const DASHBOARD_INSET_METRIC_CORAL_CLASS =
  "font-mono text-sm tabular-nums text-harbor-coral";

/** Revenue share row — use inside {@link DASHBOARD_YIELD_METRICS_STACK_CLASS}. */
export const DASHBOARD_YIELD_ROW_GRID_CLASS =
  "grid-cols-1 gap-2 sm:grid-cols-subgrid sm:gap-x-3";
