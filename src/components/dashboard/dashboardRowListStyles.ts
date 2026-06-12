/**
 * Dashboard row-list layout — panel rows and column headers inside glass sections.
 */

import {
  MV_EXPLORER_HEADER_CELL_CLASSNAME,
  MV_EXPLORER_TABLE_HEADER_WRAP_CLASSNAME,
} from "@/components/genesis/genesisMaidenVoyageTableGrid";
import { MV_POSITION_ROW } from "@/components/genesis/maidenVoyageLayoutStyles";
import { DASHBOARD_EMPTY_HINT_CLASS } from "./dashboardStyles";

/** Row shell inside glass dashboard panels (yield share, etc.). */
export const DASHBOARD_PANEL_ROW_SHELL_CLASS = `py-2.5 px-2 min-h-[52px] ${MV_POSITION_ROW}`;

/** Index-style row shell — matches Anchor / Genesis explorer tables on dark pages. */
export const DASHBOARD_INDEX_ROW_SHELL_CLASS =
  "rounded-md border border-[#1E4775]/15 bg-white shadow-sm overflow-hidden transition-colors md:hover:bg-[rgb(var(--surface-selected-rgb))]";

/**
 * md+ column tracks — network | market | type (center) | notional | action.
 * Header and body must share this grid + gap exactly.
 */
export const DASHBOARD_POSITIONS_TABLE_GRID_COLS_CLASSNAME =
  "md:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)_5.25rem] lg:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)_7rem]";

export const DASHBOARD_POSITIONS_TABLE_GRID_GAP_CLASSNAME =
  "gap-x-2 lg:gap-x-2.5";

export const DASHBOARD_POSITIONS_TABLE_MIN_WIDTH_CLASSNAME = "lg:min-w-[640px]";

export const DASHBOARD_POSITIONS_TABLE_SCROLL_WRAP_CLASSNAME =
  "max-lg:overflow-visible lg:overflow-x-auto lg:-mx-0.5 lg:px-0.5";

export const DASHBOARD_POSITIONS_TABLE_GRID_CLASSNAME = `grid ${DASHBOARD_POSITIONS_TABLE_GRID_COLS_CLASSNAME} ${DASHBOARD_POSITIONS_TABLE_GRID_GAP_CLASSNAME} items-center`;

export const DASHBOARD_INDEX_ROW_DESKTOP_CLASS = `hidden lg:grid ${DASHBOARD_POSITIONS_TABLE_GRID_COLS_CLASSNAME} ${DASHBOARD_POSITIONS_TABLE_GRID_GAP_CLASSNAME} gap-y-0 items-center text-sm py-2.5 px-2 min-h-[52px]`;

/** Anchor wallet-row mobile rhythm: primary row + secondary metric. */
export const DASHBOARD_INDEX_ROW_MOBILE_CLASS = "lg:hidden space-y-2.5 p-3 sm:p-4";

/** Stacked metric cell for mobile yield / position detail rows. */
export const DASHBOARD_INDEX_ROW_MOBILE_METRIC_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-[#1E4775]/55";

export const DASHBOARD_INDEX_ROW_MOBILE_METRICS_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-2.5";

/** Column labels inside a frosted dashboard section. */
export const DASHBOARD_TABLE_HEADER_WRAP_CLASS =
  "hidden lg:block py-1.5 px-2 border-b border-white/[0.08] mb-2 overflow-x-auto";

/** Header grid on frosted sections — white labels on glass cards. */
export const DASHBOARD_GLASS_TABLE_HEADER_GRID_CLASSNAME = `${DASHBOARD_POSITIONS_TABLE_GRID_CLASSNAME} uppercase tracking-wider text-[10px] lg:text-[11px] text-white/55 font-semibold`;

/** Body values on frosted row tiles inside dashboard sections. */
export const DASHBOARD_GLASS_VALUE_TEXT_CLASS = "font-medium text-sm text-white/90";

/** Column labels above index-style position rows. */
export const DASHBOARD_INDEX_TABLE_HEADER_WRAP_CLASS =
  "hidden lg:block bg-white py-1.5 px-2 overflow-x-auto mb-2 rounded-md border border-[#1E4775]/15 shadow-sm";

export const DASHBOARD_POSITIONS_LIST_CLASS = "space-y-2";

/** @deprecated Use DASHBOARD_INDEX_ROW_DESKTOP_CLASS */
export const DASHBOARD_POSITIONS_ROW_GRID_CLASS = DASHBOARD_INDEX_ROW_DESKTOP_CLASS;

/** Header grid — same tracks/gaps as body rows + Lifecycle typography. */
export const DASHBOARD_POSITIONS_TABLE_HEADER_GRID_CLASSNAME = `${DASHBOARD_POSITIONS_TABLE_GRID_CLASSNAME} uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold`;

/** @deprecated Use DASHBOARD_POSITIONS_TABLE_HEADER_GRID_CLASSNAME */
export const DASHBOARD_POSITIONS_HEADER_GRID_CLASS =
  DASHBOARD_POSITIONS_TABLE_HEADER_GRID_CLASSNAME;

/** Matches Genesis explorer header shell. */
export const DASHBOARD_POSITIONS_TABLE_HEADER_WRAP_CLASSNAME =
  MV_EXPLORER_TABLE_HEADER_WRAP_CLASSNAME;

/** Header cell base — same as Genesis Lifecycle column. */
export const DASHBOARD_POSITIONS_HEADER_CELL_CLASSNAME =
  MV_EXPLORER_HEADER_CELL_CLASSNAME;

/** Shared body text — compact sm only (no lg bump) for dashboard tables. */
export const DASHBOARD_POSITIONS_VALUE_TEXT_CLASS =
  "font-medium text-sm text-[#1E4775]";

export const DASHBOARD_POSITION_DETAIL_CLASS =
  "text-xs text-[#1E4775]/55 truncate";

/** Token icon in dashboard market cells — must match {@link DashboardMarketColumnHeader} ghost. */
export const DASHBOARD_MARKET_ICON_PX = 20;

/** Column alignment — network + market left, type center, notional + action right. */
export const DASHBOARD_POSITIONS_COL_NETWORK_CLASSNAME =
  "flex items-center justify-start";

export const DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME =
  "flex min-w-0 items-center justify-start gap-2 overflow-hidden text-left";

export const DASHBOARD_POSITIONS_COL_TYPE_CLASSNAME =
  "flex w-full min-w-0 items-center justify-center text-center";

export const DASHBOARD_POSITIONS_COL_NOTIONAL_CLASSNAME =
  "flex min-w-0 items-center justify-end truncate text-right tabular-nums";

export const DASHBOARD_POSITIONS_COL_ACTION_CLASSNAME =
  "flex w-full min-w-0 items-center justify-end";

/** Matches Manage button min-width — header label centers over the same footprint. */
export const DASHBOARD_POSITIONS_ACTION_FOOTPRINT_CLASSNAME =
  "inline-flex min-w-[5.25rem] shrink-0 justify-center lg:min-w-[7rem]";

export const DASHBOARD_YIELD_LIST_CLASS = "space-y-2";

export const DASHBOARD_YIELD_TABLE_GRID_COLS_CLASSNAME =
  "md:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,0.65fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.8fr)]";

export const DASHBOARD_YIELD_TABLE_MIN_WIDTH_CLASSNAME = "lg:min-w-[760px]";

export const DASHBOARD_YIELD_TABLE_SCROLL_WRAP_CLASSNAME =
  DASHBOARD_POSITIONS_TABLE_SCROLL_WRAP_CLASSNAME;

export const DASHBOARD_YIELD_TABLE_GRID_CLASSNAME = `grid ${DASHBOARD_YIELD_TABLE_GRID_COLS_CLASSNAME} ${DASHBOARD_POSITIONS_TABLE_GRID_GAP_CLASSNAME} items-center`;

export const DASHBOARD_GLASS_YIELD_TABLE_HEADER_GRID_CLASSNAME = `${DASHBOARD_YIELD_TABLE_GRID_CLASSNAME} uppercase tracking-wider text-[10px] lg:text-[11px] text-white/55 font-semibold`;

export const DASHBOARD_YIELD_TABLE_HEADER_GRID_CLASSNAME = `${DASHBOARD_YIELD_TABLE_GRID_CLASSNAME} uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold`;

export const DASHBOARD_YIELD_COL_NUMERIC_CLASSNAME =
  "flex w-full min-w-0 items-center justify-end truncate text-right tabular-nums";

export const DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME =
  "flex w-full min-w-0 items-center justify-center text-center tabular-nums";

export const DASHBOARD_YIELD_COL_BOOST_CLASSNAME =
  "flex w-full min-w-0 items-center justify-center text-center";

export const DASHBOARD_INDEX_ROW_TEXT_CLASS = "text-[#1E4775]";

export const DASHBOARD_INDEX_TABLE_HEAD_CLASS =
  "uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold";

export const DASHBOARD_YIELD_ROW_GRID_CLASS = `${DASHBOARD_YIELD_TABLE_GRID_CLASSNAME} text-sm py-2.5 px-2 min-h-[52px]`;

/** @deprecated Use DASHBOARD_YIELD_TABLE_HEADER_GRID_CLASSNAME */
export const DASHBOARD_YIELD_HEADER_GRID_CLASS = DASHBOARD_YIELD_TABLE_HEADER_GRID_CLASSNAME;

/** @deprecated Use DASHBOARD_YIELD_TABLE_MIN_WIDTH_CLASSNAME */
export const DASHBOARD_YIELD_SCROLL_MIN_WIDTH = DASHBOARD_YIELD_TABLE_MIN_WIDTH_CLASSNAME;

export const DASHBOARD_EMPTY_ON_PANEL_CLASS = DASHBOARD_EMPTY_HINT_CLASS;

/** @deprecated Use DASHBOARD_EMPTY_ON_PANEL_CLASS */
export const DASHBOARD_EMPTY_ON_DARK_CLASS = DASHBOARD_EMPTY_ON_PANEL_CLASS;

export const DASHBOARD_SKELETON_BAR_CLASS =
  "h-4 w-full max-w-md animate-pulse rounded bg-white/[0.08]";
