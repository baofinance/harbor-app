/** Shared layout tokens for the wallet dashboard page — aligned with Maiden Voyage glass. */

import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_GLASS_CARD_SHADOW,
  MV_GLASS_INSET_DARK,
  MV_GLASS_INSET_LIGHT,
  MV_META_TEXT,
  MV_POSITION_ROW,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";

export const DASHBOARD_GLASS_CARD_SHADOW = MV_GLASS_CARD_SHADOW;

/** Frosted white outer glass — matches Maiden Voyage section cards. */
export const DASHBOARD_GLASS_SURFACE = MV_GLASS_INSET_LIGHT;

/** @deprecated Prefer DASHBOARD_GLASS_INSET_LIGHT */
export const DASHBOARD_GLASS_INSET = MV_GLASS_INSET_DARK;

/** Lighter frosted glass for position/list row tiles — borderless with card shadow. */
export const DASHBOARD_GLASS_INSET_LIGHT = MV_GLASS_INSET_LIGHT;

/** Unified stat chip glass — matches Maiden Voyage KPI tiles. */
export const DASHBOARD_GLASS_STAT_TILE = MV_GLASS_INSET_DARK;

/** @deprecated Use DASHBOARD_GLASS_STAT_TILE */
export const DASHBOARD_GLASS_INSET_DARK = DASHBOARD_GLASS_STAT_TILE;

/** Frosted card wrapper for nested sections (e.g. Yield share). */
export const DASHBOARD_SECTION_CLASS = `${MV_CARD_SHELL} overflow-hidden`;

export const DASHBOARD_SECTION_INNER_GRADIENT = MV_CARD_INNER_GRADIENT;

/** Borderless section shell (Your positions — stats + groups on page bg). */
export const DASHBOARD_SECTION_FLAT_CLASS = "w-full";

export const DASHBOARD_SECTION_HEADER_INNER_CLASS =
  "grid w-full grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 gap-y-3 py-2 sm:grid-cols-[minmax(0,max-content)_1fr_minmax(0,max-content)] sm:grid-rows-1 sm:items-center sm:gap-x-4 sm:py-3";

export const DASHBOARD_SECTION_HEADER_CARD_INNER_CLASS =
  "px-4 py-3 sm:px-6 sm:py-4";

export const DASHBOARD_SECTION_HEADER_EXPANDED_CLASS = "border-b border-white/[0.08]";

export const DASHBOARD_SECTION_HEADER_FLAT_EXPANDED_CLASS = "";

export const DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS = "col-start-1 row-start-1";

export const DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS =
  "col-span-2 row-start-2 flex min-w-0 justify-center sm:col-start-2 sm:col-span-1 sm:row-start-1";

export const DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS =
  "col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3";

export const DASHBOARD_SECTION_TITLE_BTN_CLASS =
  "flex shrink-0 items-center gap-2 rounded-md text-left hover:bg-white/[0.05]";

export const DASHBOARD_SECTION_TITLE_CLASS =
  "text-lg font-medium text-white font-geo";

export const DASHBOARD_SECTION_ICON_CLASS = "h-5 w-5 shrink-0 text-white/45";

export const DASHBOARD_SECTION_CHEVRON_CLASS = "h-5 w-5 text-white/55";

export const DASHBOARD_SECTION_BODY_CLASS = "space-y-3 p-3 sm:p-4";

export const DASHBOARD_SECTION_BODY_FLAT_CLASS = "space-y-4";

export const DASHBOARD_SECTION_ACTION_BTN_CLASS =
  "shrink-0 rounded-md p-1 hover:bg-white/[0.05]";

export const DASHBOARD_INFO_ICON_CLASS = "h-4 w-4 text-white/45";

export const DASHBOARD_LINK_CLASS =
  "font-medium text-white/85 underline underline-offset-2 hover:text-white";

export const DASHBOARD_ROW_TEXT_CLASS = "text-white/90";

export const DASHBOARD_ROW_MUTED_CLASS = MV_CAPTION_TEXT;

export const DASHBOARD_METRIC_STRIP_CLASS =
  "flex flex-wrap items-stretch justify-center gap-2";

export const DASHBOARD_METRIC_STRIP_INLINE_CLASS =
  "flex min-w-0 flex-wrap items-stretch justify-center gap-2.5 sm:gap-3";

/** Frosted white stat cards on section headers. */
export const DASHBOARD_METRIC_CHIP_SURFACE = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

/** Metric tiles on section headers. */
export const DASHBOARD_METRIC_CHIP_CLASS = `flex h-[4.75rem] w-[9.5rem] shrink-0 flex-col items-center justify-center overflow-hidden px-3 py-2 text-center sm:h-[5rem] sm:w-[10.5rem] ${DASHBOARD_METRIC_CHIP_SURFACE}`;

export const DASHBOARD_METRIC_CHIP_INLINE_CLASS = DASHBOARD_METRIC_CHIP_CLASS;

export const DASHBOARD_METRIC_CHIP_LABEL_CLASS = MV_SECTION_LABEL;

export const DASHBOARD_METRIC_CHIP_VALUE_CLASS = "text-base text-white/90 sm:text-lg";

/** Uppercase labels on glass table headers. */
export const DASHBOARD_INDEX_TABLE_HEAD = MV_SECTION_LABEL;

/** Status pills on glass row bars. */
export const DASHBOARD_STATUS_PILL_ENDED_LIGHT =
  "inline-flex items-center rounded-md border border-white/[0.08] bg-[#0a1929]/40 px-2 py-0.5 text-[10px] font-medium text-white/50 sm:text-xs";

export const DASHBOARD_STATUS_PILL_ACTIVE_LIGHT =
  "inline-flex items-center rounded-md border border-[#B8EBD5]/35 bg-[#B8EBD5]/15 px-2 py-0.5 text-[10px] font-medium text-[#B8EBD5] sm:text-xs";

export const DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT =
  "inline-flex items-center rounded-md border border-white/[0.09] bg-[#0a1929]/35 px-2 py-0.5 text-[10px] font-medium text-white/70 sm:text-xs";

/** Group labels inside section bodies (Maiden Voyage, Earn, etc.). */
export const DASHBOARD_GROUP_LABEL_CLASS = MV_SECTION_LABEL;

/** Collapsible group header inside a dashboard section. */
export const DASHBOARD_GROUP_HEADER_CLASS = `flex items-center gap-2 px-3 py-2.5 sm:px-4 ${MV_POSITION_ROW}`;

export const DASHBOARD_GROUP_TITLE_CLASS = "text-sm font-semibold text-white/95";

/** Connect-wallet and inline notice panels. */
export const DASHBOARD_NOTICE_PANEL_CLASS = `${MV_CARD_SHELL} px-4 py-3 ${MV_BODY_TEXT}`;

export const DASHBOARD_EMPTY_HINT_CLASS = MV_CAPTION_TEXT;

export { MV_META_TEXT as DASHBOARD_META_TEXT };
