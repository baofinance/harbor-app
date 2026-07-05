/**
 * Portfolio layout tokens — Phase 2 card-based dashboard.
 */

import {
  MV_GLASS_INSET_DARK,
  MV_POSITION_ROW,
  MV_STAT_TILE,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { DASHBOARD_INDEX_ROW_SHELL_CLASS } from "../dashboardRowListStyles";
import {
  DASHBOARD_ACCORDION_TRANSITION,
  DASHBOARD_CHEVRON_TRANSITION,
} from "../dashboardBrand";

export const PORTFOLIO_CARD_SHELL = `rounded-xl ${MV_POSITION_ROW}`;

export const PORTFOLIO_COMPACT_CARD_CLASS = `${PORTFOLIO_CARD_SHELL} p-2.5 sm:p-3`;

/** Solid white position row — matches Anchor / Genesis index tables. */
export const PORTFOLIO_POSITION_ROW_CLASS = `${DASHBOARD_INDEX_ROW_SHELL_CLASS} min-h-[52px] py-2 pl-3.5 pr-3 sm:min-h-[52px] sm:py-2.5 sm:pl-4 sm:pr-4`;

export const PORTFOLIO_POSITION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export const PORTFOLIO_CARD_SHELL_DARK = `rounded-xl ${MV_GLASS_INSET_DARK}`;

export const PORTFOLIO_POSITION_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3";

/** Full-width position rows — one card per row (yield share list). */
export const PORTFOLIO_POSITION_STACK_CLASS = "grid grid-cols-1 gap-1.5";

/** Seamless inset row stack inside frosted product cards (Phase B). */
export const DASHBOARD_INSET_ROW_STACK_CLASS = "flex flex-col";

/** Metric cell — labels/values flush right within fixed columns. */
export const DASHBOARD_POSITION_METRIC_CELL_CLASS =
  "min-w-0 text-left sm:text-right";

/** Parent grid for yield rows — fixed metric columns align labels across rows. */
export const DASHBOARD_YIELD_METRICS_STACK_CLASS =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(0,1fr)_7.25rem_8.5rem_7rem_9rem] sm:gap-x-4 sm:gap-y-2";

/** Parent grid for earn/maiden rows — badge + trailing value column. */
export const DASHBOARD_POSITION_METRICS_STACK_CLASS =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_9rem] sm:gap-x-4 sm:gap-y-2";

/** Sail rows — badge + PnL + position value columns. */
export const DASHBOARD_SAIL_POSITION_METRICS_STACK_CLASS =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_8rem_9rem] sm:gap-x-4 sm:gap-y-2";

/** Earn rows — badge + APR + balance columns. */
export const DASHBOARD_EARN_POSITION_METRICS_STACK_CLASS =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_5rem_9rem] sm:gap-x-4 sm:gap-y-2";

/** Archived rows — market | deposited value | withdraw action. */
export const DASHBOARD_ARCHIVED_POSITION_METRICS_STACK_CLASS =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)_5.75rem] sm:gap-y-2 sm:gap-x-5";

export const DASHBOARD_ARCHIVED_POSITION_ROW_CLASS =
  "col-span-full grid grid-cols-subgrid items-center gap-x-5";

/** Row participates in parent metric column grid. */
export const DASHBOARD_INSET_ROW_SUBGRID_CLASS =
  "col-span-full grid grid-cols-subgrid items-center gap-x-4";

/** Dark inset row inside product accordion — no white card shell. */
export const DASHBOARD_INSET_ROW_SHELL_CLASS =
  "min-h-[48px] w-full border-b border-white/[0.06] px-3 py-3 sm:px-4 transition-colors duration-150 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/30 last:border-b-0";

export const DASHBOARD_INSET_ROW_CLASS =
  `flex items-center ${DASHBOARD_INSET_ROW_SHELL_CLASS}`;

export const PORTFOLIO_WIDGET_GRID_CLASS =
  "grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3";

export const PORTFOLIO_INSIGHT_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5";

export const PORTFOLIO_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-white/55";

export const PORTFOLIO_VALUE_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white/95 sm:text-base";

export const PORTFOLIO_MUTED_CLASS = "text-xs text-white/50";

export const PORTFOLIO_ACCORDION_BODY_CLASS = DASHBOARD_ACCORDION_TRANSITION;

export const PORTFOLIO_CHEVRON_CLASS =
  `h-3.5 w-3.5 transition-transform ${DASHBOARD_CHEVRON_TRANSITION}`;

/** @deprecated Use DASHBOARD_STAT_CHIP_SHELL from DashboardStatChip */
export const DASHBOARD_HERO_METRIC_TILE = `${MV_STAT_TILE} shrink-0 border-l-[3px] px-3 py-2`;

export const DASHBOARD_HERO_ALLOCATION_TRACK =
  "h-3.5 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]";

/** Allocation legend — 2-up on narrow viewports; stacked list from sm+. */
export const DASHBOARD_HERO_ALLOCATION_LEGEND_CLASS =
  "mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-col sm:gap-y-1";

export const DASHBOARD_HERO_ALLOCATION_LEGEND_ITEM_CLASS =
  "flex min-w-0 items-center gap-1.5 text-[10px] sm:text-[11px] md:text-xs";
