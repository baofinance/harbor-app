import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_GLASS_INSET_LIGHT,
  MV_HEADLINE,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_LIGHT_CARD,
  HARBOR_FROSTED_LIGHT_CARD_ELEVATED,
} from "@/components/shared/harborFrostedSurfaceStyles";

/** Two-column Sail UI+ layout — chart/main left, trade panel right (lg+). */
export const SAIL_ADVANCED_MAIN_GRID_COLUMNS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-stretch";

export const SAIL_ADVANCED_MAIN_GRID_CLASS =
  `${SAIL_ADVANCED_MAIN_GRID_COLUMNS} lg:min-h-[36rem]`;

/** @deprecated Use SAIL_ADVANCED_MAIN_GRID_CLASS */
export const SAIL_ADVANCED_GRID_CLASS = SAIL_ADVANCED_MAIN_GRID_CLASS;

/** Standard white frosted card on Sail UI+ dark chrome. */
export const SAIL_ADVANCED_FROSTED_CARD = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

/** Finer frosted glass — metric cards on dark Sail chrome. */
export const SAIL_ADVANCED_GLASS_CARD = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

/** Whitest frosted panels — chart, trade form, dropdown. */
export const SAIL_ADVANCED_FROSTED_LIGHT_PANEL = HARBOR_FROSTED_LIGHT_CARD;

export const SAIL_ADVANCED_SHELL = MV_CARD_SHELL;
export const SAIL_ADVANCED_LABEL = MV_SECTION_LABEL;
/** Small zone label above header stat groups (Market, Your wallet, etc.). */
export const SAIL_ADVANCED_SECTION_LABEL =
  "mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45";

/** Typography on white frosted cards. */
export const SAIL_ADVANCED_LIGHT_LABEL =
  "text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/55";

export const SAIL_ADVANCED_LIGHT_SECTION_TITLE =
  "text-[10px] font-semibold uppercase tracking-wider text-[#1E4775]/50";

export const SAIL_ADVANCED_LIGHT_CAPTION = "text-xs text-[#1E4775]/65";

export const SAIL_ADVANCED_LIGHT_BODY = "text-xs leading-relaxed text-[#1E4775]/70";

export const SAIL_ADVANCED_LIGHT_VALUE =
  "font-mono text-sm font-semibold tabular-nums text-[#1E4775]";

/** Typography on finer glass metric cards. */
export const SAIL_ADVANCED_GLASS_SECTION_TITLE =
  "text-[10px] font-semibold uppercase tracking-wider text-white/50";

export const SAIL_ADVANCED_GLASS_CAPTION = "text-xs text-white/65";

export const SAIL_ADVANCED_GLASS_VALUE =
  "font-mono text-sm font-semibold tabular-nums text-white/90";

export const SAIL_ADVANCED_BODY = MV_BODY_TEXT;
export const SAIL_ADVANCED_CAPTION = MV_CAPTION_TEXT;
export const SAIL_ADVANCED_META = MV_META_TEXT;
export const SAIL_ADVANCED_HEADLINE = MV_HEADLINE;

/** Embedded mint / redeem form — single white frosted shell. */
export const SAIL_EMBEDDED_FORM_PANEL = `rounded-xl p-3 sm:p-4 text-[#1E4775] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;
