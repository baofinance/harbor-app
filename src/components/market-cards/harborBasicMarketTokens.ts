/**
 * Canonical Harbor primitives for Sail + Anchor (+ Genesis primary actions) basic market surfaces.
 * Keep full class strings (Tailwind JIT scans this file).
 */

/** Nautical Blue — primary surfaces + CTAs (replaces mixing #153B63 with primary borders). */
export const HARBOR_PRIMARY_BLUE = "#1E4775" as const;
export const HARBOR_SEAFOAM_HEX = "#B8EBD5" as const;
export const HARBOR_CORAL_HEX = "#FF8A7A" as const;
export const HARBOR_CHARCOAL_HEX = "#10141A" as const;

/** Card shell: match Sail/Anchor grids (rounded-3xl, shadow-xl family, shared border). Hover lift for optional-polish todo. */
export const BASIC_MARKET_CARD_SHELL_CLASS =
  "group flex h-full min-h-0 flex-col rounded-3xl border border-[#1E4775]/12 bg-white p-4 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/[0.08] dark:border-white/10 dark:bg-slate-950 dark:shadow-black/35 sm:p-5";

/** Token strip: align Sail + Anchor (28px glyphs, arrows, stacked wallet/vault). */
export const BASIC_MARKET_FLOW_LOGO_PX = 28;
export const BASIC_MARKET_TOKEN_STRIP_OUTER_CLASS =
  "rounded-xl border border-[#1E4775]/12 bg-[#f8fafc] px-3 py-2";
export const BASIC_MARKET_TOKEN_STRIP_ROW_CLASS =
  "flex min-h-[44px] w-full flex-nowrap items-center justify-evenly gap-2 text-[#1E4775]";
export const BASIC_MARKET_FLOW_ARROW_CLASS =
  "h-4 w-4 shrink-0 text-[#1E4775]/35";
/** Icon wells for bullets + strip anchors (Genesis / Anchor aligned). */
export const BASIC_MARKET_ICON_WELL_CLASS =
  "flex h-5 w-5 shrink-0 items-center justify-center";

export const BASIC_MARKET_SYMBOL_TITLE_CLASS =
  "font-mono text-2xl font-bold leading-tight tracking-tight text-[#1E4775] dark:text-slate-200";
export const BASIC_MARKET_SUBTITLE_PRIMARY_CLASS =
  "text-[11px] leading-snug text-[#10141A]/80 dark:text-slate-300/90";
export const BASIC_MARKET_SUBTITLE_MUTED_LINE_CLASS =
  "text-[11px] leading-snug text-[#94a3b8] dark:text-slate-400/85";
/** Leverage multiplier + APR numerals: same footprint. */
export const BASIC_MARKET_METRIC_PRIMARY_CLASS =
  "font-mono text-3xl font-bold tabular-nums tracking-tight text-[#1E4775] dark:text-[#94c5e8] sm:text-4xl";
/** Numeric APR emphasis inside Anchor basic card pill — pairs with Sail leverage hierarchy. */
export const BASIC_MARKET_APR_MONO_CLASS =
  "font-mono text-lg font-bold tabular-nums tracking-tight text-[#1E4775] dark:text-[#94c5e8]";
export const BASIC_MARKET_FEATURE_BODY_CLASS =
  "text-[13px] leading-snug text-[#10141A]/80 dark:text-slate-300/85";

/** MINT / REDEEM labels (fee column + any matching rows). */
export const BASIC_MARKET_FEE_COLUMN_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/70";

export const BASIC_MARKET_NETWORK_FOOTER_DIVIDER_CLASS =
  "mt-3 w-full border-t border-[#e2e8f0]";
/** Chain label + icon row (Sail / Anchor basic cards): two steps up from `text-xs` for legibility. */
export const BASIC_MARKET_NETWORK_FOOTER_ICON_PX = 24;
export const BASIC_MARKET_NETWORK_FOOTER_TEXT_CLASS =
  "text-base font-semibold text-[#64748b] dark:text-slate-400";
export const BASIC_MARKET_NETWORK_ICON_RING_CLASS =
  "rounded-full ring-1 ring-[#1E4775]/10";

/** LONG / SHORT direction chip (Grokk palette). Dots unified to 8px rings. */
export const BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS =
  "bg-[#B8EBD5]/15 text-[#10141A] ring-1 ring-[#10141A]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]";
export const BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS =
  "bg-[#FF8A7A]/15 text-[#10141A] ring-1 ring-[#FF8A7A]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]";
export const BASIC_MARKET_DIRECTION_LONG_DOT_CLASS =
  "h-2 w-2 rounded-full bg-[#16a34a] shadow-[0_0_0_3px_rgba(22,163,74,0.18)]";
export const BASIC_MARKET_DIRECTION_SHORT_DOT_CLASS =
  "h-2 w-2 rounded-full bg-[#FF8A7A] shadow-[0_0_0_3px_rgba(255,138,122,0.22)]";

export const BASIC_MARKET_COMING_SOON_CHIP_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-[#f1f5f9] px-3.5 py-1.5 text-[12px] font-black uppercase tracking-[0.10em] text-[#64748b] ring-1 ring-[#1E4775]/10";
export const BASIC_MARKET_COMING_SOON_NEUTRAL_DOT_CLASS =
  "h-2 w-2 rounded-full bg-[#94a3b8] shadow-[0_0_0_3px_rgba(148,163,184,0.22)]";

/** Primary CTA: Nautical Blue (all basic market primary buttons). */
export const HARBOR_PRIMARY_CTA_CLASS =
  "w-full rounded-xl bg-[#1E4775] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E4775]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/30 disabled:cursor-not-allowed disabled:bg-[#1E4775]/40";
export const HARBOR_PRIMARY_CTA_INLINE_FLEX_CLASS = `flex items-center justify-center gap-1.5 ${HARBOR_PRIMARY_CTA_CLASS}`;

export const HARBOR_COMING_SOON_CTA_SURFACE_CLASS =
  "w-full rounded-xl cursor-not-allowed border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#94a3b8]";
export const HARBOR_DISABLED_PRIMARY_CTA_CLASS = HARBOR_COMING_SOON_CTA_SURFACE_CLASS;

/** Inline text link (“Learn more →”) unified. */
export const HARBOR_LEARN_MORE_INLINE_LINK_CLASS =
  "inline-flex items-center justify-center gap-1 underline decoration-[#1E4775]/30 underline-offset-2 text-center text-xs font-semibold text-[#1E4775] transition hover:text-[#0c2a4a] hover:decoration-[#1E4775]/50";

/** Translucent veil for unavailable markets (Coming soon overlays). */
export const BASIC_MARKET_COMING_SOON_VEIL_CLASS =
  "pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-white/55 backdrop-blur-sm";
export const BASIC_MARKET_COMING_SOON_CONTENT_DIM_CLASS =
  "relative z-[2] saturate-[0.85]";

/** Genesis compact card CTAs share Nautical Blue; kept slightly denser typography. */
export const HARBOR_GENESIS_PRIMARY_CTA_CLASS =
  "w-full rounded-xl bg-[#1E4775] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1E4775]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/30 disabled:cursor-not-allowed disabled:bg-[#1E4775]/35";
export const HARBOR_GENESIS_SECONDARY_CTA_CLASS =
  "w-full rounded-xl border border-[#1E4775]/20 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1E4775] transition hover:bg-[#1E4775]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/15 disabled:cursor-not-allowed disabled:border-[#CBD5E1] disabled:bg-[#F8FAFC] disabled:text-[#64748b]";

/** Basic market grids: Sail + Anchor aligned rhythm (Grokk suggestion). */
export const BASIC_MARKET_CARDS_GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
