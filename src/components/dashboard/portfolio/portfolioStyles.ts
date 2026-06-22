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
export const PORTFOLIO_POSITION_ROW_CLASS = `${DASHBOARD_INDEX_ROW_SHELL_CLASS} p-2 sm:p-2.5`;

export const PORTFOLIO_POSITION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export const PORTFOLIO_CARD_SHELL_DARK = `rounded-xl ${MV_GLASS_INSET_DARK}`;

export const PORTFOLIO_POSITION_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3";

/** Full-width position rows — one card per row (yield share list). */
export const PORTFOLIO_POSITION_STACK_CLASS = "grid grid-cols-1 gap-1.5";

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
