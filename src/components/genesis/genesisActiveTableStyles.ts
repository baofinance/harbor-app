/**
 * Single source of truth for Genesis active-markets table CSS grid tracks.
 * Header inner grid must match the open-row `lg` desktop body grid; `md` matches md-only row.
 */

/** 8-column active market, lg breakpoint (Genesis Open / header). */
export const GENESIS_ACTIVE_GRID_COLS_LG_OPEN =
  "lg:grid-cols-[32px_1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr]";

/** 8-column active market, md breakpoint (matches header). */
export const GENESIS_ACTIVE_GRID_COLS_MD_OPEN =
  "md:grid-cols-[32px_120px_80px_100px_1fr_1fr_90px_80px]";

/** Typography + grid: desktop header strip (white bar column labels). */
export const GENESIS_ACTIVE_HEADER_INNER_GRID_CLASS = `grid ${GENESIS_ACTIVE_GRID_COLS_LG_OPEN} ${GENESIS_ACTIVE_GRID_COLS_MD_OPEN} gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold`;

/** md-only row, Genesis Open (non-ended). */
export const GENESIS_ACTIVE_MD_ROW_COLS_OPEN =
  "grid-cols-[32px_120px_80px_100px_1fr_1fr_90px_80px]";

/** md-only row, ended (anchor/sail/your deposit layout). */
export const GENESIS_ACTIVE_MD_ROW_COLS_ENDED =
  "grid-cols-[32px_120px_60px_60px_1fr_80px]";

export const GENESIS_ACTIVE_MD_ROW_GRID_BASE =
  "hidden md:grid lg:hidden items-center gap-4 text-xs";

/** lg desktop row, Genesis Open. */
export const GENESIS_ACTIVE_LG_ROW_COLS_OPEN =
  "grid-cols-[32px_1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr]";

/** lg desktop row, ended (6 columns). */
export const GENESIS_ACTIVE_LG_ROW_COLS_ENDED =
  "grid-cols-[32px_1.5fr_1fr_1fr_1.5fr_1fr]";

export const GENESIS_ACTIVE_LG_ROW_GRID_BASE =
  "hidden lg:grid gap-4 items-center text-sm";

/** Completed campaigns table (6 columns); distinct from active open layout. */
export const GENESIS_COMPLETED_GRID_COLS_LG =
  "lg:grid-cols-[32px_1.5fr_1fr_1fr_1.5fr_1fr]";

export const GENESIS_COMPLETED_GRID_COLS_MD =
  "md:grid-cols-[32px_120px_60px_60px_1fr_80px]";

export const GENESIS_COMPLETED_HEADER_INNER_GRID_CLASS = `grid ${GENESIS_COMPLETED_GRID_COLS_LG} ${GENESIS_COMPLETED_GRID_COLS_MD} gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold`;

export const GENESIS_COMPLETED_DESKTOP_ROW_GRID_CLASS = `hidden md:grid ${GENESIS_COMPLETED_GRID_COLS_LG} ${GENESIS_COMPLETED_GRID_COLS_MD} gap-4 items-center`;

/** Frosted white fill — light rows on dark Maiden Voyage chrome (still reads white). */
export const GENESIS_TABLE_FROSTED_FILL =
  "bg-white/80 backdrop-blur-md backdrop-saturate-150";

/** Frosted edge + lift on dark backgrounds. */
export const GENESIS_TABLE_FROSTED_EDGE =
  "border border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/8";

export const GENESIS_TABLE_FROSTED_SURFACE = `${GENESIS_TABLE_FROSTED_FILL} ${GENESIS_TABLE_FROSTED_EDGE}`;

/** Shared table row shell — matches active Ongoing row height and radius. */
export const GENESIS_TABLE_ROW_SHELL_CLASS = `${GENESIS_TABLE_FROSTED_SURFACE} py-2.5 px-2 rounded-lg min-h-[52px]`;

/** Header label cell — matches Maiden Voyage explorer Lifecycle column. */
export const GENESIS_TABLE_HEADER_CELL_CLASSNAME =
  "flex min-w-0 items-center justify-center text-center truncate";

/** Frosted header strip above archived/completed/active rows. */
export const GENESIS_TABLE_HEADER_SHELL_CLASS = `hidden md:block ${GENESIS_TABLE_FROSTED_SURFACE} py-1.5 px-2 overflow-x-auto mb-0 rounded-md`;

/** Interactive voyage row (expandable active markets). */
export const GENESIS_TABLE_ROW_INTERACTIVE_IDLE_CLASS = `${GENESIS_TABLE_FROSTED_SURFACE} transition-colors hover:bg-white/88`;

export const GENESIS_TABLE_ROW_INTERACTIVE_EXPANDED_CLASS =
  "bg-white/90 backdrop-blur-md backdrop-saturate-150 border border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.78),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/10";

/** Compact voyage card + expanded panel shells. */
export const GENESIS_VOYAGE_COMPACT_CARD_SHELL_CLASS = `overflow-hidden rounded-xl ${GENESIS_TABLE_FROSTED_SURFACE} text-[#1E4775]`;

export const GENESIS_VOYAGE_EXPANDED_PANEL_SHELL_CLASS = `overflow-hidden border-t border-[#1E4775]/12 ${GENESIS_TABLE_FROSTED_FILL} backdrop-blur-md px-5 py-4`;

/** Inline market title pill on voyage rows. */
export const GENESIS_VOYAGE_ROW_PILL_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white/85 pl-2 pr-3.5 text-[#1E4775] shadow-sm ring-1 ring-white/35 backdrop-blur-sm";
