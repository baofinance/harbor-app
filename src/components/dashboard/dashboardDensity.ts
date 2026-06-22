/**
 * Dashboard density and surface tokens — Phase 2 visual noise polish.
 * Dashboard-only; does not modify shared Maiden Voyage globals.
 */

/** Lighter stat chip surface — subordinate to section titles. */
export const DASHBOARD_STAT_CHIP_SURFACE_CLASS =
  "rounded-lg border border-white/[0.05] bg-[#122a47]/28 backdrop-blur-sm shadow-none";

export const DASHBOARD_STAT_CHIP_SHELL = `${DASHBOARD_STAT_CHIP_SURFACE_CLASS} shrink-0 border-l-2 px-2.5 py-1.5`;

/** Inset panel inside the activity module (no nested full card shell). */
export const DASHBOARD_ACTIVITY_INSET_CLASS =
  "rounded-xl bg-white/[0.04] px-3 py-2.5 sm:px-3.5 sm:py-3";

/** Spacing rhythm — large / medium / small. */
export const DASHBOARD_GAP_MAJOR = "space-y-4";

export const DASHBOARD_GAP_CATEGORY = "space-y-1.5";

export const DASHBOARD_GAP_INNER = "space-y-1.5";

/** Dashboard-only Manage action — lighter than index page buttons. */
export const DASHBOARD_MANAGE_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-0.5 min-w-[4.75rem] px-2.5 py-1 text-[10px] font-medium bg-[#1E4775]/88 text-white/95 hover:bg-[#17395F] transition-colors duration-150 rounded-md whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4775]/50";

/** Right column alignment for position row balances + actions. */
export const DASHBOARD_POSITION_ACTIONS_CLASS =
  "flex shrink-0 items-center justify-end gap-2 sm:min-w-[7.5rem] sm:gap-2.5";
