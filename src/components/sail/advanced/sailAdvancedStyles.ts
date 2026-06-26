import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_GLASS_CARD_SHADOW,
  MV_GLASS_INSET_DARK,
  MV_HEADLINE,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_EDGE,
} from "@/components/shared/harborFrostedSurfaceStyles";

export const SAIL_ADVANCED_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-start";

/** Brighter frosted glass on dark Sail UI+ — metrics, wallet stats, position chips. */
export const SAIL_ADVANCED_FROSTED_CARD = `rounded-xl bg-white/[0.15] backdrop-blur-md backdrop-saturate-150 ring-1 ring-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] ${MV_GLASS_CARD_SHADOW}`;

/** Whitest frosted panels — chart and trade form (opaque white read, keeps blur + glass edge). */
export const SAIL_ADVANCED_FROSTED_LIGHT_PANEL =
  "bg-white/90 backdrop-blur-lg backdrop-saturate-150 " + HARBOR_FROSTED_EDGE;

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

/** Embedded manage panel — light frosted chrome on dark glass. */
export const SAIL_EMBEDDED_FORM_PANEL = `rounded-xl p-3 sm:p-4 text-[#1E4775] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;
