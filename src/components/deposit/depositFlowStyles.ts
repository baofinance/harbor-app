import { HARBOR_BTN_GLASS_OUTLINE_LIGHT } from "@/components/shared/harborButtonStyles";

/** Combined amount input card for deposit / trade flows. */
export const DEPOSIT_AMOUNT_CARD_CLASS = `rounded-xl border border-[#1E4775]/12 bg-white/70 p-2.5 shadow-sm backdrop-blur-sm`;

/** Transaction overview card — matches input card styling. */
export const DEPOSIT_OVERVIEW_CARD_CLASS = DEPOSIT_AMOUNT_CARD_CLASS;

/** Vertical gap between sections in Anchor simple-mode deposit / withdraw panels. */
export const ANCHOR_MODAL_SECTION_GAP = "space-y-2";

/** Shared pill segment track (Deposit/Mint, Collateral/Sail, fxSAVE/wstETH, etc.). */
export const DEPOSIT_SEGMENT_TRACK_CLASS =
  "flex w-full rounded-lg bg-[#e2e8f0] p-px";

/** Active segment thumb — shared by toggles and read-only balance strip. */
export const DEPOSIT_SEGMENT_ACTIVE_CLASS =
  "bg-white/90 text-[#1E4775] shadow-sm backdrop-blur-sm";

/** Balance readout bar — white pill inside amount cards (matches card inner width). */
export const DEPOSIT_BALANCE_STRIP_CLASS =
  "flex h-5 min-w-0 max-w-full items-center justify-between gap-1.5 rounded-md bg-white/90 px-2 py-0 text-[10px] font-semibold leading-none backdrop-blur-sm";

/** @deprecated Use DEPOSIT_BALANCE_STRIP_CLASS — inner only, no segment track. */
export const DEPOSIT_BALANCE_STRIP_INNER_CLASS = DEPOSIT_BALANCE_STRIP_CLASS;

/** Tight vertical gap between stacked segment toggle rows. */
export const DEPOSIT_SEGMENT_STACK_CLASS = "space-y-0.5";

/** Compact flow breadcrumb under modal tabs (Buy › Deposit). */
export const DEPOSIT_FLOW_OVERVIEW_CLASS =
  "grid shrink-0 grid-cols-[1.5rem_1fr_1.5rem] items-center border-b border-[#e2e8f0] pb-2 pt-1.5";

/** Floating deposit modal width — fixed 400px. */
export const DEPOSIT_MODAL_MAX_WIDTH_CLASS = "w-full max-w-[400px]";

/** Full-height modal panel — fills viewport so overview/footer pin to bottom. */
export const DEPOSIT_MODAL_PANEL_HEIGHT_CLASS =
  "flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden sm:h-[90vh] sm:max-h-[90vh]";

/** Modal body inset — horizontal + top; top matches bottom footer inset. */
export const DEPOSIT_MODAL_CONTENT_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-3 sm:px-4 sm:pt-4";

/** Embedded inline shell — panel shell owns horizontal padding. */
export const DEPOSIT_EMBEDDED_CONTENT_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden";

/** Gap above pinned overview (scroll content → transaction overview). */
export const DEPOSIT_MODAL_PINNED_TOP_INSET = "pt-2";

/** Bottom inset below Proceed. */
export const DEPOSIT_MODAL_EDGE_INSET_BOTTOM = "pb-2";

/** Pinned transaction overview + footer row — pushed to bottom via mt-auto. */
export const DEPOSIT_MODAL_PINNED_BOTTOM_CLASS = `mt-auto flex shrink-0 flex-col gap-1.5 ${DEPOSIT_MODAL_PINNED_TOP_INSET} ${DEPOSIT_MODAL_EDGE_INSET_BOTTOM}`;

/** Modal body: breadcrumb · scroll · pinned overview + footer. */
export const DEPOSIT_MODAL_LAYOUT_CLASS = "flex min-h-0 flex-1 flex-col";

/** Scrollable body above pinned overview + footer. */
export const ANCHOR_MODAL_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto space-y-1.5";

/** Stack of cards / toggles inside the scroll body. */
export const ANCHOR_MODAL_CARD_STACK = "space-y-2";

/** Pinned transaction overview above the action footer. */
export const ANCHOR_TRANSACTION_OVERVIEW_WRAPPER = "shrink-0";

/** Section title above the overview card. */
export const ANCHOR_TRANSACTION_OVERVIEW_LABEL =
  "block text-sm font-semibold text-[#1E4775] mb-1";

/** Inner content stack when overview has receive + fees. */
export const ANCHOR_TRANSACTION_OVERVIEW_INNER = "space-y-2";

/** Fee / bonus rows below the receive summary. */
export const ANCHOR_TRANSACTION_OVERVIEW_FEE_DIVIDER =
  "pt-2 border-t border-[#1E4775]/15 space-y-1 text-xs";

/** Footer region (fee row + primary action). */
export const ANCHOR_MODAL_FOOTER_WRAPPER = "shrink-0";

/** Fee pills + primary action — divider separates from overview above. */
export const ANCHOR_MODAL_FOOTER_CHROME =
  "shrink-0 space-y-2 border-t border-[#1E4775]/8 pt-2";

/** Embedded trade panel height — matches chart column on lg (`650px`). */
export const DEPOSIT_EMBEDDED_PANEL_HEIGHT =
  "flex min-h-[22rem] flex-col overflow-hidden sm:min-h-[26rem] lg:h-full lg:min-h-[650px] lg:max-h-[650px]";

/** Embedded trade column width on Earn / Leverage layout (lg). */
export const DEPOSIT_TRADE_PANEL_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:min-h-[650px]";

/** @deprecated Use DEPOSIT_TRADE_PANEL_GRID_CLASS */
export const ANCHOR_TRADE_PANEL_GRID_CLASS = DEPOSIT_TRADE_PANEL_GRID_CLASS;

/** @deprecated Use DEPOSIT_TRADE_PANEL_GRID_CLASS */
export const SAIL_TRADE_PANEL_GRID_CLASS = DEPOSIT_TRADE_PANEL_GRID_CLASS;

/** @deprecated Use DEPOSIT_EMBEDDED_PANEL_HEIGHT */
export const ANCHOR_EMBEDDED_PANEL_HEIGHT = DEPOSIT_EMBEDDED_PANEL_HEIGHT;

export const DEPOSIT_SECTION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

/** Shared amount input — matches Sail / deposit card styling. */
export function depositAmountInputClass(hasError = false): string {
  return `w-full rounded-lg border bg-white/90 px-3 pr-20 py-3 font-mono text-2xl text-[#1E4775] transition-all focus:border-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 ${
    hasError ? "border-red-500" : "border-[#1E4775]/20"
  }`;
}

export const DEPOSIT_AMOUNT_MAX_BUTTON_CLASS =
  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-harbor-coral px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#FF6B5A] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500";

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
