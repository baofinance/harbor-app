/** Shared layout tokens for the wallet dashboard page. */

/** Outer glass panel — dark navy tint over page bg #1E4775. */
export const DASHBOARD_GLASS_SURFACE =
  "border border-white/[0.08] bg-[#153B63]/62 backdrop-blur-xl shadow-[0_8px_32px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/** Nested glass inside a section — darker inset for rows and chips. */
export const DASHBOARD_GLASS_INSET =
  "border border-white/[0.07] bg-[#0a1929]/48 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/** Large section container (Your positions, Yield share). */
export const DASHBOARD_SECTION_CLASS = `rounded-2xl overflow-hidden ${DASHBOARD_GLASS_SURFACE}`;

export const DASHBOARD_SECTION_HEADER_INNER_CLASS =
  "grid w-full grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 gap-y-3 px-4 py-3 sm:grid-cols-[minmax(0,max-content)_1fr_minmax(0,max-content)] sm:grid-rows-1 sm:items-center sm:gap-x-4 sm:px-6 sm:py-4";

export const DASHBOARD_SECTION_HEADER_EXPANDED_CLASS = "border-b border-white/[0.08]";

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

export const DASHBOARD_SECTION_ACTION_BTN_CLASS =
  "shrink-0 rounded-md p-1 hover:bg-white/[0.05]";

export const DASHBOARD_INFO_ICON_CLASS = "h-4 w-4 text-white/45";

export const DASHBOARD_LINK_CLASS =
  "font-medium text-white/85 underline underline-offset-2 hover:text-white";

export const DASHBOARD_ROW_TEXT_CLASS = "text-white/90";

export const DASHBOARD_ROW_MUTED_CLASS = "text-white/55";

export const DASHBOARD_METRIC_STRIP_CLASS =
  "flex flex-wrap items-stretch justify-center gap-2";

export const DASHBOARD_METRIC_STRIP_INLINE_CLASS =
  "flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2";

/** Metric tiles on glass section headers. */
export const DASHBOARD_METRIC_CHIP_CLASS = `flex h-[3.5rem] w-[7.25rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-md px-2 py-1.5 text-center sm:w-[7.5rem] ${DASHBOARD_GLASS_INSET}`;

export const DASHBOARD_METRIC_CHIP_INLINE_CLASS = DASHBOARD_METRIC_CHIP_CLASS;

export const DASHBOARD_METRIC_CHIP_LABEL_CLASS =
  "uppercase tracking-widest text-white/50 leading-tight";

export const DASHBOARD_METRIC_CHIP_VALUE_CLASS = "text-white/90";

export const DASHBOARD_METRIC_CHIP_EMPHASIZED_CLASS =
  "border-white/12 bg-[#1E4775]/40";

/** Uppercase labels on glass table headers. */
export const DASHBOARD_INDEX_TABLE_HEAD =
  "uppercase tracking-wider text-[10px] lg:text-[11px] text-white/55 font-semibold";

/** Status pills on glass row bars. */
export const DASHBOARD_STATUS_PILL_ENDED_LIGHT =
  "inline-flex items-center rounded-md border border-white/[0.08] bg-[#0a1929]/40 px-2 py-0.5 text-[10px] font-medium text-white/50 sm:text-xs";

export const DASHBOARD_STATUS_PILL_ACTIVE_LIGHT =
  "inline-flex items-center rounded-md border border-[#B8EBD5]/35 bg-[#B8EBD5]/15 px-2 py-0.5 text-[10px] font-medium text-[#B8EBD5] sm:text-xs";

export const DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT =
  "inline-flex items-center rounded-md border border-white/[0.09] bg-[#0a1929]/35 px-2 py-0.5 text-[10px] font-medium text-white/70 sm:text-xs";

/** Group labels inside section bodies (Maiden Voyage, Earn, etc.). */
export const DASHBOARD_GROUP_LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-widest text-white/45";
