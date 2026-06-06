/**
 * Maiden Voyage explorer table grids — aligned with Anchor index rows (32px network + 7 columns).
 * Network | Lifecycle | Voyage | Type | Phase | Est. capacity | Launch window | Action
 */

/** md+ column tracks — must match on header and every row (same discipline as anchorMarketsTableGrid). */
export const MV_EXPLORER_TABLE_GRID_COLS_CLASSNAME =
  "md:grid-cols-[32px_minmax(0,0.75fr)_minmax(0,1.32fr)_minmax(0,0.88fr)_minmax(0,0.72fr)_minmax(0,0.88fr)_minmax(0,0.92fr)_minmax(0,0.8fr)]";

/** Desktop horizontal scroll width — do not apply on mobile (breaks stacked rows). */
export const MV_EXPLORER_TABLE_MIN_WIDTH_CLASSNAME = "md:min-w-[880px]";

/** Desktop header — matches AnchorMarketsTableHeader shell. */
export const MV_EXPLORER_TABLE_HEADER_WRAP_CLASSNAME =
  "hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md border border-[#1E4775]/15 shadow-sm";

export const MV_EXPLORER_TABLE_HEADER_GRID_CLASSNAME = `grid ${MV_EXPLORER_TABLE_GRID_COLS_CLASSNAME} gap-3 lg:gap-3.5 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold`;

/** Desktop row grid (md+). */
export const MV_EXPLORER_TABLE_ROW_DESKTOP_CLASSNAME = `hidden md:grid ${MV_EXPLORER_TABLE_GRID_COLS_CLASSNAME} gap-3 lg:gap-3.5 items-center text-sm py-2.5 px-2 min-h-[52px]`;

export const MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME =
  "rounded-md border border-[#1E4775]/15 bg-white shadow-sm overflow-hidden transition-colors md:hover:bg-[rgb(var(--surface-selected-rgb))]";

/** Mobile stacked layout (< md) — primary actions top-right like Anchor index rows. */
export const MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME =
  "md:hidden w-full min-w-0 space-y-2.5 p-3 text-sm";

export const MV_EXPLORER_MOBILE_VOYAGE_CLASSNAME =
  "flex w-full min-w-0 flex-col items-start gap-1.5";

export const MV_EXPLORER_MOBILE_META_GRID_CLASSNAME =
  "grid w-full grid-cols-2 gap-x-3 gap-y-2.5";

export const MV_EXPLORER_MOBILE_META_LABEL_CLASSNAME =
  "mb-0.5 text-[10px] uppercase tracking-wide text-[#1E4775]/70";

export const MV_EXPLORER_COL_NETWORK_CLASSNAME =
  "flex items-center justify-center";

export const MV_EXPLORER_COL_LIFECYCLE_CLASSNAME =
  "flex min-w-0 items-center justify-center text-center";

/** Header label cell — same typography as grid parent; use on every column title. */
export const MV_EXPLORER_HEADER_CELL_CLASSNAME = `${MV_EXPLORER_COL_LIFECYCLE_CLASSNAME} truncate`;

export const MV_EXPLORER_COL_VOYAGE_CLASSNAME =
  "min-w-0 overflow-hidden text-center";

export const MV_EXPLORER_COL_VOYAGE_INNER_CLASSNAME =
  "flex flex-col items-center justify-center gap-1 min-w-0";

export const MV_EXPLORER_COL_TYPE_CLASSNAME =
  "flex min-w-0 items-center justify-center text-center";

export const MV_EXPLORER_COL_PHASE_CLASSNAME =
  "text-center min-w-0 truncate text-sm text-[#1E4775]";

export const MV_EXPLORER_COL_CAPACITY_CLASSNAME =
  "text-center min-w-0 font-mono text-sm font-semibold tabular-nums text-[#1E4775]";

export const MV_EXPLORER_COL_LAUNCH_CLASSNAME =
  "text-center min-w-0 text-sm text-[#1E4775]/80";

export const MV_EXPLORER_COL_ACTION_CLASSNAME =
  "flex min-w-0 items-center justify-center text-center";

/** Market type chip — same as Anchor deposit-assets / collateral chips. */
export const MV_EXPLORER_TYPE_CHIP_CLASSNAME =
  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-[#1E4775]/10 text-[#1E4775] rounded-none";

export const MV_EXPLORER_OPEN_STATUS_CLASSNAME =
  "text-[10px] font-bold uppercase tracking-wider text-[#3d8f7a]";

export const MV_EXPLORER_TABLE_SCROLL_WRAP_CLASSNAME = "overflow-x-auto -mx-0.5 px-0.5";

export const MV_EXPLORER_TABLE_INNER_CLASSNAME = `w-full min-w-0 ${MV_EXPLORER_TABLE_MIN_WIDTH_CLASSNAME} space-y-2`;
