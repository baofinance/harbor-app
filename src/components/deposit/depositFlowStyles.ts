import { HARBOR_BTN_GLASS_OUTLINE_LIGHT } from "@/components/shared/harborButtonStyles";

/** Combined amount input card for deposit / trade flows. */
export const DEPOSIT_AMOUNT_CARD_CLASS = `rounded-xl border border-[#1E4775]/12 bg-white/70 p-3 shadow-sm backdrop-blur-sm`;

export const DEPOSIT_SECTION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

const DEPOSIT_PRIMARY_BASE =
  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25";

export const DEPOSIT_PRIMARY_MINT_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#4A9784] text-white hover:bg-[#3d8271] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_NAVY_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#1E4775] text-white hover:bg-[#17395F] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_RETRY_CLASS = `${DEPOSIT_PRIMARY_BASE} border border-harbor-coral/50 bg-harbor-coral/10 text-harbor-coral hover:bg-harbor-coral/15`;

export const DEPOSIT_PRIMARY_DISABLED_CLASS = `${DEPOSIT_PRIMARY_BASE} cursor-not-allowed border border-[#1E4775]/15 bg-[#1E4775]/8 text-[#1E4775]/55`;

export const DEPOSIT_CANCEL_BUTTON_CLASS = `w-full rounded-lg py-3 px-4 font-semibold ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;
