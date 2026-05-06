/**
 * Shared layout for Genesis / Sail / Anchor index filter rows — keep padding in sync.
 */
export const INDEX_MARKETS_TOOLBAR_ROW_CLASS =
  "pt-3 pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 flex-wrap lg:flex-nowrap";

/**
 * Same as {@link INDEX_MARKETS_TOOLBAR_ROW_CLASS} plus one top rule — use as the sole separator
 * between the hero / stats stack and the filter row (avoids double lines with nearby `border-t` divs).
 * Do not use on Ledger Marks leaderboard hero (that page keeps its own layout).
 */
export const INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS = `${INDEX_MARKETS_TOOLBAR_ROW_CLASS} border-t border-white/10`;

/**
 * Feature tiles under index titles — matches origin/yield-share Genesis heroes
 * (rounded-lg, py-2.5, border-white/10, subtle blur, centered column layout).
 */
export const INDEX_HERO_INTRO_CARD_CLASS =
  "bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative";

export const INDEX_HERO_INTRO_ICON_CLASS = "w-5 h-5 shrink-0 text-[#FF8A7A]";

export const INDEX_HERO_INTRO_TITLE_CLASS = "font-bold text-white text-base";

export const INDEX_HERO_INTRO_BODY_CLASS = "text-xs text-white/80 leading-relaxed";

/**
 * Standard accent ring (`ring-1`) — center card on 3-up rows, both inner cards on 4-up,
 * and flanking highlights (positions 2 & 4) on 5-up rows.
 */
export const INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS = "ring-1 ring-[#FF8A7A]/25";

/** Stronger ring (`ring-2`) — center card only on 5-up intro rows (Sail). */
export const INDEX_HERO_INTRO_CARD_RING_ACCENT_STRONG_CLASS =
  "ring-2 ring-[#FF8A7A]/35";

/**
 * Coral informational tags on dark blue toolbars (campaign name, etc.).
 * Soft fill, no border, square corners — reads like row tags, not primary buttons.
 */
/** One step above `text-xs` section labels (“Active Campaign”, etc.). */
export const INDEX_CORAL_INFO_TAG_CLASS =
  "inline-flex items-center rounded-none px-2 py-0.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap bg-[#E67A6B]/15 text-[#F5D4CC]";

/**
 * Genesis market row — “TEST” when `test: true` (replaces status / “ENDS IN …”).
 * Dark Harbor pill + cream text (toolbar campaign contrast on white rows); `text-[10px]` to match Collateral chip scale.
 */
export const GENESIS_MARKET_TEST_TAG_CLASS =
  "inline-flex cursor-help items-center justify-center rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-[#0a1628] text-[#F5D4CC]";

/** Shown on hover over the TEST tag (see {@link GENESIS_MARKET_TEST_TAG_CLASS}). */
export const GENESIS_MARKET_TEST_TAG_TOOLTIP =
  "Don't deposit, do so at your own risk.";

/**
 * Ledger Marks strip — same `text-sm` scale as `INDEX_CORAL_INFO_TAG_CLASS` (above `text-xs` row labels).
 */
export const INDEX_CORAL_LEDGER_TAG_PILL_CLASS =
  "inline-flex cursor-help items-center gap-1.5 rounded-none bg-[#E67A6B]/15 px-2 py-0.5 text-[#F5D4CC] text-sm font-semibold tracking-wide whitespace-nowrap";

/**
 * Dark navy (#0a1628) at 50% opacity so the page blue shows through.
 * Genesis + Sail strips, Anchor rewards row, Marks Leaderboard hero card.
 */
export const LEDGER_MARKS_STRIP_SURFACE_CLASS =
  "rounded-md overflow-visible border border-white/15 bg-[#0a1628]/50 backdrop-blur-sm shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)]";

/**
 * Same surface as {@link LEDGER_MARKS_STRIP_SURFACE_CLASS} but no bottom border.
 * Use when this strip sits directly above {@link INDEX_MARKETS_TOOLBAR_ROW_WITH_TOP_RULE_CLASS}
 * so the toolbar’s `border-t` is the only horizontal rule (matches Transparency).
 */
export const LEDGER_MARKS_STRIP_SURFACE_ABOVE_TOOLBAR_CLASS =
  "rounded-md overflow-visible border-x border-t border-white/15 border-b-0 bg-[#0a1628]/50 backdrop-blur-sm shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)]";

/** Same fill as `LEDGER_MARKS_STRIP_SURFACE_CLASS` with hero padding + radius. */
export const LEDGER_MARKS_HERO_CARD_CLASS =
  "mt-1 mb-2 rounded-xl border border-white/15 bg-[#0a1628]/50 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm";
