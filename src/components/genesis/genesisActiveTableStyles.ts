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
