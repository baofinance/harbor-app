import {
  DASHBOARD_REVENUE_SHARE_CARD_CLASS,
  DASHBOARD_REVENUE_SHARE_CARD_INNER_GLOW,
  DASHBOARD_SECTION_HEADER_OPEN_CLASS,
} from "./dashboardBrand";
import { DASHBOARD_SECTION_HEADER_HOVER_CLASS } from "./dashboardInteraction";
import { HARBOR_BTN_SECONDARY_CLASS } from "@/components/shared/harborButtonStyles";
import {
  HARBOR_STATUS_PILL_ACTIVE_GLASS,
  HARBOR_STATUS_PILL_ACTIVE_LIGHT,
  HARBOR_STATUS_PILL_CORAL_LIGHT,
  HARBOR_STATUS_PILL_ENDED_GLASS,
  HARBOR_STATUS_PILL_ENDED_LIGHT,
  HARBOR_STATUS_PILL_MARKS_LIGHT,
  HARBOR_STATUS_PILL_NEUTRAL_GLASS,
  HARBOR_STATUS_PILL_NEUTRAL_LIGHT,
  HARBOR_STATUS_PILL_STABILITY_GLASS,
  HARBOR_STATUS_PILL_STABILITY_LIGHT,
  HARBOR_STATUS_PILL_WALLET_LIGHT,
} from "@/components/shared/harborStatusPillStyles";
import {
  HARBOR_STAT_TILE_GLASS_CHIP_CLASS,
  HARBOR_STAT_TILE_GLASS_CHIP_INLINE_CLASS,
  HARBOR_STAT_TILE_GLASS_CHIP_LABEL_CLASS,
  HARBOR_STAT_TILE_GLASS_CHIP_SURFACE,
  HARBOR_STAT_TILE_GLASS_CHIP_VALUE_CLASS,
} from "@/components/shared/harborStatTileStyles";
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
import { INDEX_PAGE_TITLE_HEADING_LEFT_CLASS } from "@/components/shared/indexPageTitleStyles";

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
  "grid w-full grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 gap-y-2 py-1.5 sm:grid-cols-[minmax(0,max-content)_1fr_minmax(0,max-content)] sm:grid-rows-1 sm:items-center sm:gap-x-4 sm:py-2.5";

export const DASHBOARD_SECTION_HEADER_CARD_INNER_CLASS =
  "px-4 py-3 sm:px-6 sm:py-4";

export const DASHBOARD_SECTION_HEADER_EXPANDED_CLASS = "border-b border-white/[0.08]";

export const DASHBOARD_SECTION_HEADER_FLAT_EXPANDED_CLASS = "";

export const DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS = "col-start-1 row-start-1";

export const DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS =
  "col-span-2 row-start-2 flex min-w-0 justify-end sm:col-start-2 sm:col-span-1 sm:row-start-1 sm:justify-end";

export const DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS =
  "col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3";

export const DASHBOARD_SECTION_TITLE_BTN_CLASS =
  "flex shrink-0 items-center gap-2 rounded-md text-left hover:bg-white/[0.05]";

export const DASHBOARD_SECTION_ICON_CLASS = "h-5 w-5 shrink-0 text-white/45";

export const DASHBOARD_SECTION_CHEVRON_CLASS = "h-5 w-5 text-white/55";

export const DASHBOARD_SECTION_BODY_CLASS = "space-y-3 p-3 sm:p-4";

export const DASHBOARD_SECTION_BODY_FLAT_CLASS = "space-y-4";

export const DASHBOARD_SECTION_EXPAND_BTN_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] p-1.5 text-white/85 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white sm:p-2";

/** @deprecated Use DASHBOARD_SECTION_EXPAND_BTN_CLASS */
export const DASHBOARD_SECTION_ACTION_BTN_CLASS = DASHBOARD_SECTION_EXPAND_BTN_CLASS;

export const DASHBOARD_INFO_ICON_CLASS = "h-4 w-4 text-white/45";

export const DASHBOARD_LINK_CLASS =
  "font-medium text-white/85 underline underline-offset-2 hover:text-white";

export const DASHBOARD_ROW_TEXT_CLASS = "text-white/90";

export const DASHBOARD_ROW_MUTED_CLASS = MV_CAPTION_TEXT;

export const DASHBOARD_METRIC_STRIP_CLASS =
  "flex flex-wrap items-stretch justify-center gap-2";

export const DASHBOARD_METRIC_STRIP_INLINE_CLASS =
  "flex min-w-0 flex-wrap items-stretch justify-center gap-2.5 sm:gap-3";

/** Page-level stat strip — stack groups on mobile; one chip row from md+. */
export const DASHBOARD_METRIC_STRIP_SCROLL_CLASS =
  "flex min-w-0 w-full flex-col gap-4 md:flex-row md:items-end md:justify-end md:gap-2.5 md:overflow-x-auto md:[-ms-overflow-style:none] md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden lg:gap-3";

/** Frosted white stat cards on section headers. */
export const DASHBOARD_METRIC_CHIP_SURFACE = HARBOR_STAT_TILE_GLASS_CHIP_SURFACE;

/** Metric tiles on section headers. */
export const DASHBOARD_METRIC_CHIP_CLASS = HARBOR_STAT_TILE_GLASS_CHIP_CLASS;

/** Page stat strip chips — grid cells on mobile; compact fixed width from md for single-row fit. */
export const DASHBOARD_METRIC_CHIP_INLINE_CLASS = HARBOR_STAT_TILE_GLASS_CHIP_INLINE_CLASS;

export const DASHBOARD_METRIC_CHIP_LABEL_CLASS = HARBOR_STAT_TILE_GLASS_CHIP_LABEL_CLASS;

export const DASHBOARD_METRIC_CHIP_VALUE_CLASS = HARBOR_STAT_TILE_GLASS_CHIP_VALUE_CLASS;

/** Uppercase labels on glass table headers. */
export const DASHBOARD_INDEX_TABLE_HEAD = MV_SECTION_LABEL;

/** Status pills on white position rows. */
export const DASHBOARD_STATUS_PILL_BASE =
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold sm:text-xs";

export const DASHBOARD_STATUS_PILL_ENDED_LIGHT = HARBOR_STATUS_PILL_ENDED_LIGHT;
export const DASHBOARD_STATUS_PILL_ACTIVE_LIGHT = HARBOR_STATUS_PILL_ACTIVE_LIGHT;
export const DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT = HARBOR_STATUS_PILL_NEUTRAL_LIGHT;
export const DASHBOARD_STATUS_PILL_WALLET_LIGHT = HARBOR_STATUS_PILL_WALLET_LIGHT;
export const DASHBOARD_STATUS_PILL_STABILITY_LIGHT = HARBOR_STATUS_PILL_STABILITY_LIGHT;
export const DASHBOARD_STATUS_PILL_MARKS_LIGHT = HARBOR_STATUS_PILL_MARKS_LIGHT;
export const DASHBOARD_STATUS_PILL_CORAL_LIGHT = HARBOR_STATUS_PILL_CORAL_LIGHT;
export const DASHBOARD_STATUS_PILL_ENDED_GLASS = HARBOR_STATUS_PILL_ENDED_GLASS;
export const DASHBOARD_STATUS_PILL_ACTIVE_GLASS = HARBOR_STATUS_PILL_ACTIVE_GLASS;
export const DASHBOARD_STATUS_PILL_NEUTRAL_GLASS = HARBOR_STATUS_PILL_NEUTRAL_GLASS;
export const DASHBOARD_STATUS_PILL_STABILITY_GLASS = HARBOR_STATUS_PILL_STABILITY_GLASS;

/** Group labels inside section bodies (Maiden Voyage, Earn, etc.). */
export const DASHBOARD_GROUP_LABEL_CLASS = MV_SECTION_LABEL;

/** @deprecated Replaced by DashboardProductCard header */
export const DASHBOARD_GROUP_HEADER_CLASS = `flex items-center gap-2 px-3 py-2.5 sm:px-4 ${MV_POSITION_ROW}`;

/** @deprecated Replaced by DashboardProductCard header */
export const DASHBOARD_GROUP_TITLE_CLASS = "text-sm font-semibold text-white/95";

/** Frosted product card shell — matches Maiden Voyage sidebar cards. */
export const DASHBOARD_PRODUCT_CARD_CLASS = `${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden relative`;

/** Revenue share — flagship gold treatment. */
export const DASHBOARD_PRODUCT_CARD_FEATURED_CLASS = `${MV_CARD_SHELL} ${DASHBOARD_REVENUE_SHARE_CARD_CLASS} ${DASHBOARD_REVENUE_SHARE_CARD_INNER_GLOW}`;

export const DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS =
  "transition-[box-shadow] duration-200 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.28)]";

export const DASHBOARD_PRODUCT_CARD_FEATURED_COLLAPSED_HOVER_CLASS =
  "transition-[box-shadow] duration-200 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.28)] hover:ring-1 hover:ring-harbor-gold/20";

export const DASHBOARD_PRODUCT_CARD_HEADER_CLASS =
  "flex flex-col gap-0";

export const DASHBOARD_PRODUCT_CARD_HEADER_FEATURED_CLASS =
  "";

export const DASHBOARD_PRODUCT_CARD_HEADER_BUTTON_CLASS =
  `w-full rounded-lg text-left transition-colors duration-150 ${DASHBOARD_SECTION_HEADER_HOVER_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30`;

const DASHBOARD_PRODUCT_HEADER_HIT_FOCUS_CLASS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/30";

export const DASHBOARD_PRODUCT_HEADER_ROW_CLASS =
  "flex min-h-[2.75rem] w-full items-stretch";

export const DASHBOARD_PRODUCT_HEADER_NAV_LINK_CLASS =
  `inline-flex shrink-0 items-center gap-2.5 self-stretch py-2 pl-3 pr-2.5 -ml-3 transition-colors duration-150 sm:pl-4 sm:-ml-4 ${DASHBOARD_SECTION_HEADER_HOVER_CLASS} ${DASHBOARD_PRODUCT_HEADER_HIT_FOCUS_CLASS}`;

export const DASHBOARD_PRODUCT_HEADER_NAV_STATIC_CLASS =
  "inline-flex shrink-0 items-center gap-2.5 self-stretch py-2 pl-3 pr-2.5 -ml-3 sm:pl-4 sm:-ml-4";

export const DASHBOARD_PRODUCT_HEADER_EXPAND_BTN_CLASS =
  `flex min-w-0 flex-1 items-center gap-2 self-stretch py-2 pl-2 pr-3 -mr-3 text-left transition-colors duration-150 sm:pr-4 sm:-mr-4 ${DASHBOARD_SECTION_HEADER_HOVER_CLASS} ${DASHBOARD_PRODUCT_HEADER_HIT_FOCUS_CLASS}`;

export const DASHBOARD_PRODUCT_CARD_HEADER_ROW_CLASS =
  "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-2.5";

export const DASHBOARD_PRODUCT_CARD_BODY_CLASS = "px-3 pb-2.5 pt-0 sm:px-4 sm:pb-3";

export const DASHBOARD_PRODUCT_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-normal text-white/80";

export const DASHBOARD_PRODUCT_TITLE_FEATURED_CLASS =
  "text-xs font-semibold uppercase tracking-normal text-white/90";

export const DASHBOARD_PRODUCT_AMOUNT_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white/95";

export const DASHBOARD_PRODUCT_COUNT_CLASS = "text-xs text-white/55";

export const DASHBOARD_PRODUCT_ACCENT_BAR_CLASS = "absolute inset-y-0 left-0 w-[3px]";

export const DASHBOARD_MV_PREVIEW_CLASS =
  "flex w-full flex-col gap-2 border-t border-white/[0.08] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4";

/** Portfolio hero — 5-column mockup grid. */
export const DASHBOARD_HERO_GRID_CLASS =
  "grid grid-cols-1 gap-4 divide-y divide-white/[0.08] md:grid-cols-2 md:divide-y lg:grid-cols-[minmax(0,1fr)_minmax(0,2.35fr)_repeat(3,minmax(5.25rem,0.68fr))] lg:gap-0 lg:divide-x lg:divide-y-0 lg:divide-white/[0.08]";

export const DASHBOARD_HERO_STATS_ROW_CLASS =
  "md:col-span-2 md:grid md:grid-cols-3 md:gap-4 md:border-t md:border-white/[0.08] md:pt-4 lg:contents lg:border-t-0 lg:pt-0";

export const DASHBOARD_HERO_COLUMN_CLASS =
  "min-w-0 py-3 first:pt-0 last:pb-0 lg:px-4 lg:py-0 lg:first:pl-0 lg:last:pr-0";

/** Yield stat columns — compact width, right-aligned on desktop. */
export const DASHBOARD_HERO_YIELD_COLUMN_CLASS = `${DASHBOARD_HERO_COLUMN_CLASS} lg:pl-5 lg:text-right`;

export const DASHBOARD_HERO_STAT_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-white/50";

export const DASHBOARD_HERO_STAT_CONTEXT_CLASS =
  "text-[9px] font-normal normal-case tracking-normal text-white/40";

export const DASHBOARD_HERO_STAT_VALUE_CLASS =
  "font-mono text-xl font-bold tabular-nums text-white sm:text-2xl";

export const DASHBOARD_SECTION_SUMMARY_CLASS =
  "min-w-0 truncate text-xs tabular-nums text-white/85 sm:text-sm";

export const DASHBOARD_SECTION_SUMMARY_SEPARATOR_CLASS = "text-white/35";

/** Portfolio hero — primary page focal point. */
export const DASHBOARD_PORTFOLIO_HERO_CLASS = `${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-4 sm:px-5 sm:py-5`;

export const DASHBOARD_PORTFOLIO_HERO_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-wider text-white/60";

export const DASHBOARD_PORTFOLIO_HERO_METRIC_CLASS = "min-w-0 space-y-1";

export const DASHBOARD_PORTFOLIO_HERO_METRIC_VALUE_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl";

/** Secondary category summary tiles beneath hero. */
export const DASHBOARD_CATEGORY_SUMMARY_CARD_CLASS = `rounded-xl ${MV_GLASS_INSET_DARK} px-3 py-2.5 sm:px-3.5 sm:py-3`;

export const DASHBOARD_CATEGORY_SUMMARY_TITLE_CLASS =
  "text-xs font-medium text-white/65";

export const DASHBOARD_CATEGORY_SUMMARY_VALUE_CLASS =
  "mt-0.5 font-mono text-lg font-semibold tabular-nums text-white/95";

export const DASHBOARD_CATEGORY_SUMMARY_COUNT_CLASS = "mt-0.5 text-xs text-white/50";

export const DASHBOARD_CATEGORY_SUMMARY_ICON_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-[#0a1929]/55";

export const DASHBOARD_PRODUCT_SUBTITLE_CLASS = `${MV_CAPTION_TEXT} text-xs sm:text-sm`;

export const DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS = "opacity-90";

export const DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS =
  DASHBOARD_SECTION_HEADER_OPEN_CLASS;

export const DASHBOARD_PRODUCT_TOTAL_CLASS =
  "font-mono text-xs tabular-nums text-white/75 sm:text-sm md:text-base";

export const DASHBOARD_PAGE_HEADER_CLASS = "min-w-0 text-left";

export const DASHBOARD_PAGE_HEADER_TITLE_CLASS = INDEX_PAGE_TITLE_HEADING_LEFT_CLASS;

export const DASHBOARD_PAGE_HEADER_SUBTITLE_CLASS =
  "mt-1 max-w-md text-sm font-medium leading-snug tracking-tight text-white/85 sm:text-base";

export const DASHBOARD_PAGE_HEADER_STATS_CLASS =
  "min-w-0 w-full flex-1 lg:min-w-0 lg:pt-0.5";

/** Labeled cluster in the page stat strip (positions vs yield share). */
export const DASHBOARD_PAGE_STATS_GROUP_CLASS =
  "flex min-w-0 w-full shrink-0 flex-col gap-1.5 md:w-auto";

export const DASHBOARD_PAGE_STATS_GROUP_LABEL_CLASS =
  "px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs";

/** Positions — 2-up mobile; single nowrap row from md+. */
export const DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS =
  "grid w-full grid-cols-2 gap-2 sm:gap-2.5 md:flex md:w-auto md:flex-nowrap md:items-stretch md:gap-2 lg:gap-2.5";

/** Yield share — pair on mobile; joins positions row from md+. */
export const DASHBOARD_PAGE_STATS_YIELD_CHIPS_CLASS =
  "grid w-full max-w-md grid-cols-2 gap-2 sm:gap-2.5 md:max-w-none md:flex md:w-auto md:flex-nowrap md:items-stretch md:gap-2 lg:gap-2.5";

/** @deprecated Use DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS or _YIELD_ variant. */
export const DASHBOARD_PAGE_STATS_GROUP_CHIPS_CLASS =
  DASHBOARD_PAGE_STATS_POSITIONS_CHIPS_CLASS;

/** Horizontal rule on mobile; vertical rule between groups from md+. */
export const DASHBOARD_PAGE_STATS_DIVIDER_CLASS =
  "h-px w-full shrink-0 bg-white/12 md:mx-0.5 md:h-[4rem] md:w-px md:self-end lg:h-[4.25rem] xl:h-[4.5rem] 2xl:h-[5rem]";

/** Boxed stat tiles in product card headers — right-aligned strip. */
export const DASHBOARD_PRODUCT_HEADER_METRICS_CLASS =
  "flex min-w-0 flex-nowrap items-stretch justify-end gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS = MV_SECTION_LABEL;

export const DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS =
  "font-mono text-sm tabular-nums font-semibold text-white/90 sm:text-base";

/** Product icon badges in card headers */
const DASHBOARD_PRODUCT_ICON_BADGE_BASE =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-[#0a1929]/55 backdrop-blur-md";

export const DASHBOARD_PRODUCT_ICON_MV_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} border-harbor-coral/25 text-harbor-coral`;

export const DASHBOARD_PRODUCT_ICON_EARN_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} border-harbor-mint/25 bg-harbor-mint/8 text-harbor-mint`;

export const DASHBOARD_PRODUCT_ICON_SAIL_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} border-harbor-purple/25 bg-harbor-purple/8 text-harbor-purple`;

export const DASHBOARD_PRODUCT_ICON_YIELD_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} border-harbor-gold/25 text-harbor-gold`;

export const DASHBOARD_PRODUCT_ICON_YIELD_FEATURED_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} h-8 w-8 border-harbor-gold/35 bg-harbor-gold/10 ring-1 ring-harbor-gold/30 text-harbor-gold`;

export const DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS = `${DASHBOARD_PRODUCT_ICON_BADGE_BASE} border-white/10 text-white/40`;

export const DASHBOARD_PRODUCT_ACCENT_MV_CLASS = "bg-harbor-coral";
export const DASHBOARD_PRODUCT_ACCENT_EARN_CLASS = "bg-harbor-mint";
export const DASHBOARD_PRODUCT_ACCENT_SAIL_CLASS = "bg-harbor-purple";
export const DASHBOARD_PRODUCT_ACCENT_YIELD_CLASS = "bg-harbor-gold";
export const DASHBOARD_PRODUCT_ACCENT_YIELD_FEATURED_CLASS =
  "bg-gradient-to-b from-harbor-gold to-harbor-gold/60";
export const DASHBOARD_PRODUCT_ACCENT_ARCHIVED_CLASS = "bg-white/30";

/** Left accent on dashboard stat chips — matches category chip colors. */
export const DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS = "border-l-harbor-mint/45";
export const DASHBOARD_STAT_CHIP_BORDER_SAIL_CLASS = "border-l-harbor-purple/45";
export const DASHBOARD_STAT_CHIP_BORDER_ARCHIVED_CLASS = "border-l-white/18";
export const DASHBOARD_STAT_CHIP_BORDER_MAIDEN_CLASS = "border-l-harbor-coral/45";
export const DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS = "border-l-harbor-gold/45";
export const DASHBOARD_STAT_CHIP_BORDER_MUTED_CLASS = "border-l-white/18";

export const DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_GOLD_CLASS = "text-harbor-gold";
export const DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MINT_CLASS = "text-harbor-mint";
export const DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MUTED_CLASS = "text-white/60";

export const DASHBOARD_PRODUCT_LOADING_HINT_CLASS = MV_META_TEXT;

export const DASHBOARD_VIEW_ALL_BTN_CLASS = HARBOR_BTN_SECONDARY_CLASS;

/** @deprecated Use DASHBOARD_VIEW_ALL_BTN_CLASS */
export const DASHBOARD_VIEW_ALL_LINK_CLASS = DASHBOARD_VIEW_ALL_BTN_CLASS;

/** Connect-wallet and inline notice panels. */
export const DASHBOARD_NOTICE_PANEL_CLASS = `${MV_CARD_SHELL} px-3 py-3 sm:px-4 ${MV_BODY_TEXT}`;

export const DASHBOARD_NOTICE_PANEL_INNER_CLASS =
  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

export const DASHBOARD_EMPTY_HINT_CLASS = MV_CAPTION_TEXT;

export { MV_META_TEXT as DASHBOARD_META_TEXT };
