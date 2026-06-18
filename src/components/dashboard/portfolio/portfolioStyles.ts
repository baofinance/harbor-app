/**
 * Portfolio layout tokens — Phase 2 card-based dashboard.
 */

import { MV_GLASS_INSET_DARK, MV_POSITION_ROW } from "@/components/genesis/maidenVoyageLayoutStyles";

export const PORTFOLIO_CARD_SHELL = `rounded-xl ${MV_POSITION_ROW}`;

export const PORTFOLIO_COMPACT_CARD_CLASS = `${PORTFOLIO_CARD_SHELL} p-2.5 sm:p-3`;

export const PORTFOLIO_CARD_SHELL_DARK = `rounded-xl ${MV_GLASS_INSET_DARK}`;

export const PORTFOLIO_POSITION_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3";

/** Full-width position rows — one card per row (yield share list). */
export const PORTFOLIO_POSITION_STACK_CLASS = "grid grid-cols-1 gap-2";

export const PORTFOLIO_WIDGET_GRID_CLASS =
  "grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3";

export const PORTFOLIO_INSIGHT_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5";

export const PORTFOLIO_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-white/55";

export const PORTFOLIO_VALUE_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white/95 sm:text-base";

export const PORTFOLIO_MUTED_CLASS = "text-xs text-white/60";

export const PORTFOLIO_ACCORDION_BODY_CLASS =
  "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none";

export const PORTFOLIO_CHEVRON_CLASS =
  "h-4 w-4 text-white/70 transition-transform duration-300 ease-out motion-reduce:transition-none";
