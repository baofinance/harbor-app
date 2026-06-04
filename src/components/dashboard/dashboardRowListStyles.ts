/**
 * Dashboard row-list layout — panel rows and column headers inside glass sections.
 */

import { DASHBOARD_GLASS_INSET_LIGHT } from "./dashboardStyles";

/** Row shell inside glass dashboard panels. */
export const DASHBOARD_PANEL_ROW_SHELL_CLASS = `rounded-md py-2.5 px-2 min-h-[52px] ${DASHBOARD_GLASS_INSET_LIGHT}`;

/** Column labels inside a glass panel. */
export const DASHBOARD_TABLE_HEADER_WRAP_CLASS =
  "hidden md:block py-1.5 px-2 border-b border-white/[0.08] mb-2 overflow-x-auto";

export const DASHBOARD_POSITIONS_LIST_CLASS = "space-y-2";

export const DASHBOARD_POSITIONS_ROW_GRID_CLASS =
  "hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_auto] gap-3 items-center text-sm";

export const DASHBOARD_POSITIONS_HEADER_GRID_CLASS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_auto] gap-3 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-white/55 font-semibold";

export const DASHBOARD_YIELD_LIST_CLASS = "space-y-2";

export const DASHBOARD_YIELD_SCROLL_MIN_WIDTH = "min-w-[920px]";

export const DASHBOARD_YIELD_ROW_GRID_CLASS = `grid ${DASHBOARD_YIELD_SCROLL_MIN_WIDTH} w-full grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] gap-3 items-center text-sm`;

export const DASHBOARD_YIELD_HEADER_GRID_CLASS = `grid ${DASHBOARD_YIELD_SCROLL_MIN_WIDTH} w-full grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] gap-3 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-white/55 font-semibold`;

export const DASHBOARD_EMPTY_ON_PANEL_CLASS = "text-sm text-white/55";

/** @deprecated Use DASHBOARD_EMPTY_ON_PANEL_CLASS */
export const DASHBOARD_EMPTY_ON_DARK_CLASS = DASHBOARD_EMPTY_ON_PANEL_CLASS;

export const DASHBOARD_SKELETON_BAR_CLASS =
  "h-4 w-full max-w-md animate-pulse rounded bg-white/[0.08]";
