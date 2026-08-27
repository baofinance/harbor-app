import { HARBOR_BTN_GLASS_OUTLINE_LIGHT } from "@/components/shared/harborButtonStyles";

/** Combined amount input card for deposit / trade flows. */
export const DEPOSIT_AMOUNT_CARD_CLASS = `rounded-xl border border-[#1E4775]/12 bg-white/70 p-2.5 shadow-sm backdrop-blur-sm`;

/** Vertical gap between sections in Anchor simple-mode deposit / withdraw panels. */
export const ANCHOR_MODAL_SECTION_GAP = "space-y-2";

/** Scrollable body above pinned overview + footer. */
export const ANCHOR_MODAL_SCROLL_CLASS =
  "min-h-0 flex-1 space-y-2 overflow-y-auto";

/** Stack of cards / toggles inside the scroll body. */
export const ANCHOR_MODAL_CARD_STACK = "space-y-2";

/** Pinned transaction overview above the action footer. */
export const ANCHOR_TRANSACTION_OVERVIEW_WRAPPER = "shrink-0 pt-2";

/** Section title above the overview card. */
export const ANCHOR_TRANSACTION_OVERVIEW_LABEL =
  "block text-sm font-semibold text-[#1E4775] mb-1";

/** Inner content stack when overview has receive + fees. */
export const ANCHOR_TRANSACTION_OVERVIEW_INNER = "space-y-2";

/** Fee / bonus rows below the receive summary. */
export const ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER =
  "pt-2 border-t border-[#1E4775]/15 space-y-1 text-xs";

/** Footer region (fee row + primary action). */
export const ANCHOR_MODAL_FOOTER_WRAPPER = "shrink-0 mt-auto";

/** Border + padding above fee row and primary button. */
export const ANCHOR_MODAL_FOOTER_CHROME =
  "shrink-0 space-y-2.5 border-t border-[#1E4775]/8 pt-3";

export const DEPOSIT_SECTION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

const DEPOSIT_PRIMARY_BASE =
  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25";

export const DEPOSIT_PRIMARY_MINT_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#4A9784] text-white hover:bg-[#3d8271] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_NAVY_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#1E4775] text-white hover:bg-[#17395F] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_RETRY_CLASS = `${DEPOSIT_PRIMARY_BASE} border border-harbor-coral/50 bg-harbor-coral/10 text-harbor-coral hover:bg-harbor-coral/15`;

export const DEPOSIT_PRIMARY_DISABLED_CLASS = `${DEPOSIT_PRIMARY_BASE} cursor-not-allowed border border-[#1E4775]/15 bg-[#1E4775]/8 text-[#1E4775]/55`;

export const DEPOSIT_CANCEL_BUTTON_CLASS = `rounded-lg py-3 px-5 font-semibold shrink-0 ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;
