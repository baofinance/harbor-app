import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_HEADLINE,
  MV_META_TEXT,
  MV_SECTION_LABEL,
  MV_STAT_TILE,
} from "@/components/genesis/maidenVoyageLayoutStyles";

export const SAIL_ADVANCED_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-start";

export const SAIL_ADVANCED_PANEL = MV_STAT_TILE;
export const SAIL_ADVANCED_SHELL = MV_CARD_SHELL;
export const SAIL_ADVANCED_LABEL = MV_SECTION_LABEL;
export const SAIL_ADVANCED_BODY = MV_BODY_TEXT;
export const SAIL_ADVANCED_CAPTION = MV_CAPTION_TEXT;
export const SAIL_ADVANCED_META = MV_META_TEXT;
export const SAIL_ADVANCED_HEADLINE = MV_HEADLINE;

/** Embedded manage panel — light form chrome on dark glass. */
export const SAIL_EMBEDDED_FORM_PANEL =
  "rounded-xl border border-white/[0.08] bg-white/95 p-3 sm:p-4 text-[#1E4775] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]";
