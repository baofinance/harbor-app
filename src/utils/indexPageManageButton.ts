/**
 * Primary "Manage" action on Genesis / Sail / Anchor index rows — one visual system.
 * Matches {@link GenesisMarketRowClaimActions} desktop + compact variants.
 *
 * Min width matches the longer “Withdraw” label on Anchor withdrawal rows so Manage
 * and Withdraw share the same footprint where both appear.
 */
export const INDEX_MANAGE_BUTTON_CLASS_DESKTOP =
  "app-index-manage-btn inline-flex items-center justify-center min-w-[7rem] px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap";

/** Same geometry as Manage; coral for Anchor withdrawal (expired / early withdraw). */
export const INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL =
  "inline-flex items-center justify-center min-w-[7rem] px-4 py-2 text-xs font-medium bg-[#FF8A7A] text-white hover:bg-[#FF6B5A] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap";

/** Outline secondary — same footprint as Manage (modal Cancel). */
export const INDEX_MODAL_CANCEL_BUTTON_CLASS_DESKTOP =
  "inline-flex items-center justify-center min-w-[7rem] px-4 py-2 text-xs font-medium bg-white border border-[#1E4775]/35 text-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-md whitespace-nowrap";

export const INDEX_MANAGE_BUTTON_CLASS_COMPACT =
  "app-index-manage-btn px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-md whitespace-nowrap";
