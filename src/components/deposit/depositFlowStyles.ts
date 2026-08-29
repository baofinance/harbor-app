import { HARBOR_BTN_GLASS_OUTLINE_LIGHT } from "@/components/shared/harborButtonStyles";

/** Combined amount input card for deposit / trade flows. */
export const DEPOSIT_AMOUNT_CARD_CLASS = `rounded-xl border border-[#1E4775]/12 bg-white/70 p-2.5 shadow-sm backdrop-blur-sm`;

/** Transaction overview card — matches input card styling with stable min height. */
export const DEPOSIT_OVERVIEW_CARD_CLASS = `${DEPOSIT_AMOUNT_CARD_CLASS} min-h-[4.75rem]`;

/** Vertical gap between sections in Anchor simple-mode deposit / withdraw panels. */
export const ANCHOR_MODAL_SECTION_GAP = "space-y-2";

/** Shared pill segment track (Deposit/Mint, Collateral/Sail, fxSAVE/wstETH, etc.). */
export const DEPOSIT_SEGMENT_TRACK_CLASS =
  "flex w-full rounded-lg bg-[#e2e8f0] p-px";

/** Active segment thumb — shared by toggles and read-only balance strip. */
export const DEPOSIT_SEGMENT_ACTIVE_CLASS =
  "bg-white/90 text-[#1E4775] shadow-sm backdrop-blur-sm";

/** Full-width balance readout styled like a selected segment toggle. */
export const DEPOSIT_BALANCE_STRIP_INNER_CLASS = `flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold ${DEPOSIT_SEGMENT_ACTIVE_CLASS}`;

/** Tight vertical gap between stacked segment toggle rows. */
export const DEPOSIT_SEGMENT_STACK_CLASS = "space-y-0.5";

/** Compact flow breadcrumb under modal tabs (Buy / Mint › Deposit). */
export const DEPOSIT_FLOW_OVERVIEW_CLASS =
  "grid min-h-[2.25rem] shrink-0 grid-cols-[1.75rem_1fr_1.75rem] items-center border-b border-[#e2e8f0] pt-1 pb-2";


/** Scrollable body above pinned overview + footer. */
export const ANCHOR_MODAL_SCROLL_CLASS =
  "min-h-0 flex-1 space-y-2 overflow-y-auto";

/** Stack of cards / toggles inside the scroll body. */
export const ANCHOR_MODAL_CARD_STACK = "space-y-2";

/** Pinned transaction overview above the action footer. */
export const ANCHOR_TRANSACTION_OVERVIEW_WRAPPER = "shrink-0 pt-2 min-h-[6.5rem]";

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
  "shrink-0 min-h-[6.75rem] space-y-2.5 border-t border-[#1E4775]/8 pt-3";

/** Embedded trade panel height — matches chart column on lg (`650px`). */
export const DEPOSIT_EMBEDDED_PANEL_HEIGHT =
  "flex min-h-[22rem] flex-col overflow-hidden sm:min-h-[26rem] lg:h-full lg:min-h-[650px] lg:max-h-[650px]";

/** Shared chart + trade panel grid — middle width between Anchor (340–440) and Sail (300–380). */
export const DEPOSIT_TRADE_PANEL_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(330px,400px)] lg:items-start lg:min-h-[650px]";

/** @deprecated Use DEPOSIT_EMBEDDED_PANEL_HEIGHT */
export const ANCHOR_EMBEDDED_PANEL_HEIGHT = DEPOSIT_EMBEDDED_PANEL_HEIGHT;

export const DEPOSIT_SECTION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

/** Compact native select for Anchor deposit / withdraw panels. */
export const DEPOSIT_COMPACT_SELECT_CLASS =
  "mt-1 w-full rounded-lg border border-[#1E4775]/20 bg-white/85 px-2.5 py-2 text-sm text-[#1E4775] focus:border-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 disabled:cursor-not-allowed disabled:opacity-50";

const DEPOSIT_PRIMARY_BASE =
  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25";

export const DEPOSIT_PRIMARY_MINT_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#4A9784] text-white hover:bg-[#3d8271] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_NAVY_CLASS = `${DEPOSIT_PRIMARY_BASE} bg-[#1E4775] text-white hover:bg-[#17395F] active:scale-[0.99]`;

export const DEPOSIT_PRIMARY_RETRY_CLASS = `${DEPOSIT_PRIMARY_BASE} border border-harbor-coral/50 bg-harbor-coral/10 text-harbor-coral hover:bg-harbor-coral/15`;

export const DEPOSIT_PRIMARY_DISABLED_CLASS = `${DEPOSIT_PRIMARY_BASE} cursor-not-allowed border border-[#1E4775]/15 bg-[#1E4775]/8 text-[#1E4775]/55`;

export const DEPOSIT_CANCEL_BUTTON_CLASS = `rounded-lg py-3 px-5 font-semibold shrink-0 ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;
