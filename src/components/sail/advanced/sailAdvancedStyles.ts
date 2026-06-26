import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_GLASS_INSET_DARK,
  MV_GLASS_INSET_LIGHT,
  MV_HEADLINE,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";

export const SAIL_ADVANCED_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-start";

/** Lighter frosted glass — metrics column and stat chips. */
export const SAIL_ADVANCED_FROSTED_CARD = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

export const SAIL_ADVANCED_PANEL = `rounded-xl ${MV_GLASS_INSET_DARK}`;
export const SAIL_ADVANCED_SHELL = MV_CARD_SHELL;
export const SAIL_ADVANCED_LABEL = MV_SECTION_LABEL;
/** Small zone label above header stat groups (Your wallet, This market, etc.). */
export const SAIL_ADVANCED_SECTION_LABEL =
  "mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45";
export const SAIL_ADVANCED_BODY = MV_BODY_TEXT;
export const SAIL_ADVANCED_CAPTION = MV_CAPTION_TEXT;
export const SAIL_ADVANCED_META = MV_META_TEXT;
export const SAIL_ADVANCED_HEADLINE = MV_HEADLINE;

/** Embedded manage panel — light form chrome on dark glass. */
export const SAIL_EMBEDDED_FORM_PANEL =
  "rounded-xl border border-white/[0.08] bg-white/95 p-3 sm:p-4 text-[#1E4775] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]";
