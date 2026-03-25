/**
 * Shared layout for Genesis / Sail / Anchor index filter rows — keep padding in sync.
 */
export const INDEX_MARKETS_TOOLBAR_ROW_CLASS =
  "pt-3 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-wrap";

/**
 * Coral informational tags on dark blue toolbars (campaign name, etc.).
 * Soft fill, no border, square corners — reads like row tags, not primary buttons.
 */
/** One step above `text-xs` section labels (“Active Campaign”, etc.). */
export const INDEX_CORAL_INFO_TAG_CLASS =
  "inline-flex items-center rounded-none px-2 py-0.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap bg-[#E67A6B]/15 text-[#F5D4CC]";

/**
 * Ledger Marks strip — same `text-sm` scale as `INDEX_CORAL_INFO_TAG_CLASS` (above `text-xs` row labels).
 */
export const INDEX_CORAL_LEDGER_TAG_PILL_CLASS =
  "flex cursor-help items-center gap-1.5 rounded-none bg-[#E67A6B]/15 px-2 py-0.5 text-[#F5D4CC] text-sm font-semibold tracking-wide";
