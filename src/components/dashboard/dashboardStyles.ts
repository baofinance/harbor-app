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

/** Page-level stat strip — stack groups until xl; wrap chip rows on wide side-by-side header. */
export const DASHBOARD_METRIC_STRIP_SCROLL_CLASS =
  "flex min-w-0 w-full flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-stretch xl:justify-end xl:gap-x-3 xl:gap-y-4";

/** Frosted white stat cards on section headers. */
export const DASHBOARD_METRIC_CHIP_SURFACE = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

/** Metric tiles on section headers. */
export const DASHBOARD_METRIC_CHIP_CLASS = `flex h-[4.75rem] w-[9.5rem] shrink-0 flex-col items-center justify-center overflow-hidden px-3 py-2 text-center sm:h-[5rem] sm:w-[10.5rem] ${DASHBOARD_METRIC_CHIP_SURFACE}`;

/** Page stat strip chips — full width in grid cells; fixed width when in xl flex row. */
export const DASHBOARD_METRIC_CHIP_INLINE_CLASS = `flex h-[4.25rem] min-w-0 w-full max-w-full shrink-0 flex-row items-center justify-start gap-2 overflow-hidden px-2.5 py-2 text-left sm:h-[4.75rem] sm:gap-2.5 sm:px-3 xl:h-[4.75rem] xl:w-[9.5rem] xl:shrink-0 2xl:h-[5rem] 2xl:w-[10.5rem] ${DASHBOARD_METRIC_CHIP_SURFACE}`;

export const DASHBOARD_METRIC_CHIP_LABEL_CLASS = MV_SECTION_LABEL;

export const DASHBOARD_METRIC_CHIP_VALUE_CLASS = "text-sm text-white/90 sm:text-base md:text-lg";

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

/** @deprecated Replaced by DashboardProductCard header */
export const DASHBOARD_GROUP_HEADER_CLASS = `flex items-center gap-2 px-3 py-2.5 sm:px-4 ${MV_POSITION_ROW}`;

/** @deprecated Replaced by DashboardProductCard header */
export const DASHBOARD_GROUP_TITLE_CLASS = "text-sm font-semibold text-white/95";

/** Frosted product card shell — matches Maiden Voyage sidebar cards. */
export const DASHBOARD_PRODUCT_CARD_CLASS = `${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`;

export const DASHBOARD_PRODUCT_CARD_HEADER_CLASS =
  "flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-4";

export const DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS = "opacity-90";

export const DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS =
  "border-b border-white/[0.08]";

export const DASHBOARD_PRODUCT_CARD_BODY_CLASS = "px-3 pb-3 sm:px-5 sm:pb-5";

export const DASHBOARD_PRODUCT_TITLE_CLASS = "text-sm font-semibold text-white/95 sm:text-base md:text-lg";

export const DASHBOARD_PRODUCT_SUBTITLE_CLASS = `${MV_CAPTION_TEXT} text-xs sm:text-sm`;

export const DASHBOARD_PRODUCT_TOTAL_CLASS =
  "font-mono text-xs tabular-nums text-white/75 sm:text-sm md:text-base";

export const DASHBOARD_PAGE_HEADER_CLASS =
  "flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6";

export const DASHBOARD_PAGE_HEADER_TITLE_CLASS =
  "font-bold font-mono text-white text-3xl leading-[1.08] sm:text-4xl sm:leading-[1.05] xl:text-5xl 2xl:text-6xl";

export const DASHBOARD_PAGE_HEADER_SUBTITLE_CLASS =
  "mt-1 max-w-md text-sm font-medium leading-snug tracking-tight text-white/85 sm:text-base";

export const DASHBOARD_PAGE_HEADER_STATS_CLASS =
  "min-w-0 w-full flex-1 xl:max-w-[min(100%,52rem)] xl:pt-1";

/** Labeled cluster in the page stat strip (positions vs yield share). */
export const DASHBOARD_PAGE_STATS_GROUP_CLASS =
  "flex min-w-0 w-full shrink-0 flex-col gap-1.5 xl:w-auto";

export const DASHBOARD_PAGE_STATS_GROUP_LABEL_CLASS =
  "px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs";

/** Positions — 2-up mobile, 4-up md–lg, wrapping row xl+. */
export const DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS =
  "grid w-full grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 md:gap-3 xl:flex xl:w-auto xl:flex-wrap xl:items-stretch xl:justify-end xl:gap-2.5";

/** Yield share — pair on one row until xl, then wraps with positions row. */
export const DASHBOARD_PAGE_STATS_YIELD_CHIPS_CLASS =
  "grid w-full max-w-md grid-cols-2 gap-2 sm:gap-2.5 xl:max-w-none xl:flex xl:w-auto xl:flex-wrap xl:items-stretch xl:justify-end xl:gap-2.5";

/** @deprecated Use DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS or _YIELD_ variant. */
export const DASHBOARD_PAGE_STATS_GROUP_CHIPS_CLASS =
  DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS;

/** Horizontal rule below xl; vertical rule between groups on xl+. */
export const DASHBOARD_PAGE_STATS_DIVIDER_CLASS =
  "h-px w-full shrink-0 bg-white/12 xl:mx-1 xl:h-auto xl:w-px xl:self-stretch";

/** Flat header metrics inside product cards — no nested frosted chip shells. */
export const DASHBOARD_PRODUCT_HEADER_METRICS_CLASS =
  "flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-6";

export const DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS = MV_SECTION_LABEL;

export const DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS =
  "font-mono text-sm tabular-nums font-semibold text-white/90 sm:text-base";

/** Product icon badges in card headers */
const DASHBOARD_PRODUCT_ICON_BADGE_BASE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a1929]/55 backdrop-blur-md sm:h-10 sm:w-10";

export const DASHBOARD_PRODUCT_ICON_MV_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} text-[#FF8A7A]`;

export const DASHBOARD_PRODUCT_ICON_EARN_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} text-[#B8EBD5]`;

export const DASHBOARD_PRODUCT_ICON_SAIL_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} text-[#C4B5FD]`;

export const DASHBOARD_PRODUCT_ICON_YIELD_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} text-[#C4B5FD]`;

export const DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} text-white/50`;

export const DASHBOARD_PRODUCT_LOADING_HINT_CLASS = MV_META_TEXT;

export const DASHBOARD_VIEW_ALL_LINK_CLASS =
  "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-white/70 transition hover:text-white/90 sm:text-xs md:text-sm";

/** Connect-wallet and inline notice panels. */
export const DASHBOARD_NOTICE_PANEL_CLASS = `${MV_CARD_SHELL} px-3 py-3 sm:px-4 ${MV_BODY_TEXT}`;

export const DASHBOARD_NOTICE_PANEL_INNER_CLASS =
  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

export const DASHBOARD_EMPTY_HINT_CLASS = MV_CAPTION_TEXT;

export { MV_META_TEXT as DASHBOARD_META_TEXT };
