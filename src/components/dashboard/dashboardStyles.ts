/** Shared layout tokens for the wallet dashboard page. */

/** Unified white panel — matches Sail leverage market row shell. */
export const DASHBOARD_SECTION_CLASS =
  "rounded-lg border border-[#1E4775]/15 bg-white shadow-sm overflow-hidden";

export const DASHBOARD_SECTION_HEADER_INNER_CLASS =
  "grid w-full grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 gap-y-3 px-4 py-3 sm:grid-cols-[minmax(0,max-content)_1fr_minmax(0,max-content)] sm:grid-rows-1 sm:items-center sm:gap-x-4 sm:px-6 sm:py-4";

export const DASHBOARD_SECTION_HEADER_EXPANDED_CLASS =
  "border-b border-[#1E4775]/15";

export const DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS = "col-start-1 row-start-1";

export const DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS =
  "col-span-2 row-start-2 flex min-w-0 justify-center sm:col-start-2 sm:col-span-1 sm:row-start-1";

export const DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS =
  "col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3";

export const DASHBOARD_SECTION_TITLE_BTN_CLASS =
  "flex shrink-0 items-center gap-2 rounded-md text-left hover:bg-[#1E4775]/5";

export const DASHBOARD_SECTION_TITLE_CLASS =
  "text-lg font-medium text-[#153B63] font-geo";

export const DASHBOARD_SECTION_ICON_CLASS = "h-5 w-5 shrink-0 text-[#1E4775]/40";

export const DASHBOARD_SECTION_CHEVRON_CLASS = "h-5 w-5 text-[#1E4775]/55";

export const DASHBOARD_SECTION_BODY_CLASS = "space-y-3 bg-white p-3 sm:p-4";

export const DASHBOARD_METRIC_STRIP_CLASS =
  "flex flex-wrap items-stretch justify-center gap-2";

export const DASHBOARD_METRIC_STRIP_INLINE_CLASS =
  "flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2";

/** Metric tiles on white section headers. */
export const DASHBOARD_METRIC_CHIP_CLASS =
  "flex h-[3.5rem] w-[7.25rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border border-[#1E4775]/15 bg-[#1E4775]/5 px-2 py-1.5 text-center sm:w-[7.5rem]";

export const DASHBOARD_METRIC_CHIP_INLINE_CLASS =
  "flex h-[3.5rem] w-[7.25rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border border-[#1E4775]/15 bg-[#1E4775]/5 px-2 py-1.5 text-center sm:w-[7.5rem]";

export const DASHBOARD_METRIC_CHIP_LABEL_CLASS =
  "uppercase tracking-widest text-[#1E4775]/60 leading-tight";

export const DASHBOARD_METRIC_CHIP_VALUE_CLASS = "text-[#153B63]";

export const DASHBOARD_METRIC_CHIP_EMPHASIZED_CLASS =
  "border-[#1E4775]/25 bg-[#1E4775]/[0.08]";

/** Navy uppercase labels on white header bars. */
export const DASHBOARD_INDEX_TABLE_HEAD =
  "uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold";

/** Status pills on white row bars. */
export const DASHBOARD_STATUS_PILL_ENDED_LIGHT =
  "inline-flex items-center rounded-md border border-[#1E4775]/15 bg-[#1E4775]/5 px-2 py-0.5 text-[10px] font-medium text-[#1E4775]/60 sm:text-xs";

export const DASHBOARD_STATUS_PILL_ACTIVE_LIGHT =
  "inline-flex items-center rounded-md border border-[#B8EBD5]/40 bg-[#B8EBD5]/15 px-2 py-0.5 text-[10px] font-medium text-[#2d6b52] sm:text-xs";

export const DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT =
  "inline-flex items-center rounded-md border border-[#1E4775]/15 bg-white px-2 py-0.5 text-[10px] font-medium text-[#1E4775]/70 sm:text-xs";
