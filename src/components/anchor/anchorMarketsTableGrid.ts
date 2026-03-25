/**
 * Shared Tailwind grid templates for Anchor stability-pool index header + rows.
 * Keep header and body on identical `grid-cols-[…]` tracks (Sail / playbook discipline).
 *
 * @see SailMarketsTableHeader — same pattern
 */

/** lg+: Network | Token | Deposit Assets | APR | Earnings | Reward Assets | Position | Actions */
export const ANCHOR_MARKETS_TABLE_ROW_LG_CLASSNAME =
  "hidden lg:grid grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.32fr)_minmax(0,0.88fr)_minmax(0,0.88fr)_minmax(0,1.02fr)_minmax(0,1fr)_minmax(0,0.78fr)] gap-3 lg:gap-3.5 items-center text-sm";

/** md–lg: Network | Token | APR | Position / earnings / rewards | Actions */
export const ANCHOR_MARKETS_TABLE_ROW_MD_CLASSNAME =
  "hidden md:grid lg:hidden grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.85fr)_minmax(0,auto)] gap-3 md:gap-3.5 items-center text-sm";

/** Desktop table header shell (scroll on narrow viewports; rounded like Sail). */
export const ANCHOR_MARKETS_TABLE_HEADER_LG_WRAP_CLASSNAME =
  "hidden lg:block bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md border border-[#1E4775]/15 shadow-sm";

export const ANCHOR_MARKETS_TABLE_HEADER_LG_GRID_CLASSNAME =
  "grid grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.32fr)_minmax(0,0.88fr)_minmax(0,0.88fr)_minmax(0,1.02fr)_minmax(0,1fr)_minmax(0,0.78fr)] gap-3 lg:gap-3.5 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold";

export const ANCHOR_MARKETS_TABLE_HEADER_MD_WRAP_CLASSNAME =
  "hidden md:block lg:hidden bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md border border-[#1E4775]/15 shadow-sm";

export const ANCHOR_MARKETS_TABLE_HEADER_MD_GRID_CLASSNAME =
  "grid grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.85fr)_minmax(0,auto)] gap-3 md:gap-3.5 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-semibold";

/** Wallet “not earning yield” rows: align with the same column tracks as market rows. */
export const ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME =
  "hidden lg:grid grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.32fr)_minmax(0,0.88fr)_minmax(0,0.88fr)_minmax(0,1.02fr)_minmax(0,1fr)_minmax(0,0.78fr)] gap-3 lg:gap-3.5 items-center text-sm";

export const ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME =
  "hidden md:grid lg:hidden grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.85fr)_minmax(0,auto)] gap-3 md:gap-3.5 items-center text-sm";
