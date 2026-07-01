/**
 * Frosted white surfaces — reads as white on dark Harbor chrome with glass coherence.
 * Use for cards, rows, modals, dropdowns, nav pills (not toggle thumbs or text).
 */

/** Whitest frosted fill — light cards, panels, chart shells. */
export const HARBOR_FROSTED_LIGHT_FILL =
  "bg-white/90 backdrop-blur-lg backdrop-saturate-150";

/** Core frosted fill (alias of light fill for shared surfaces). */
export const HARBOR_FROSTED_FILL = HARBOR_FROSTED_LIGHT_FILL;

/** Lift + glass edge on dark page backgrounds. */
export const HARBOR_FROSTED_EDGE =
  "border border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/8";

/** Full light card on dark chrome — chart, trade form, inner metric tiles. */
export const HARBOR_FROSTED_LIGHT_CARD = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_EDGE}`;

/** Standard elevated light card — Tide flywheel, Earn panels, basic market cards. */
export const HARBOR_FROSTED_LIGHT_CARD_ELEVATED =
  `rounded-xl ${HARBOR_FROSTED_LIGHT_CARD} ring-1 ring-[#1E4775]/10`;

/** Rounded light card — alias of elevated shell for backward compatibility. */
export const HARBOR_FROSTED_LIGHT_CARD_ROUNDED = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

export const HARBOR_FROSTED_SURFACE = HARBOR_FROSTED_LIGHT_CARD;

/** Index table rows / headers — harbor-blue border family. */
export const HARBOR_FROSTED_INDEX_EDGE =
  "border border-harbor-blue/15 shadow-sm ring-1 ring-[#1E4775]/6";

export const HARBOR_FROSTED_INDEX_SURFACE = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_INDEX_EDGE}`;

export const HARBOR_FROSTED_SURFACE_HOVER =
  "transition-colors hover:bg-white/92 backdrop-blur-lg backdrop-saturate-150";

export const HARBOR_FROSTED_SURFACE_SELECTED =
  `${HARBOR_FROSTED_LIGHT_FILL} border border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.78),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/10`;

/** Modal / dropdown panels. */
export const HARBOR_FROSTED_PANEL_FILL = HARBOR_FROSTED_LIGHT_FILL;

export const HARBOR_FROSTED_MODAL_SHELL = `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/20 shadow-2xl shadow-black/10`;

export const HARBOR_FROSTED_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/12 shadow-xl ring-1 ring-black/5`;

/** Nav “More” burger menu — frosted glass panel over navy header. */
export const HARBOR_FROSTED_NAV_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/15 shadow-xl ring-1 ring-[#1E4775]/8 backdrop-blur-lg backdrop-saturate-150`;

/** Inner cards inside expanded rows / transparency grids. */
export const HARBOR_FROSTED_CARD_CLASS = HARBOR_FROSTED_LIGHT_CARD_ROUNDED;

/** Form controls on frosted panels. */
export const HARBOR_FROSTED_INPUT_FILL = "bg-white/85 backdrop-blur-sm";

/**
 * Selected chrome on dark navy header — same frosted white as Earn/Sail basic market cards.
 * Use on active nav links, UI/UI+ selected segment, theme trigger, tabs, etc.
 */
export const HARBOR_FROSTED_ACTIVE_PILL = `${HARBOR_FROSTED_LIGHT_CARD} text-[#1E4775]`;

export const HARBOR_FROSTED_PILL =
  "bg-white/85 backdrop-blur-sm shadow-sm ring-1 ring-white/35";

/** Top protocol banner bar. */
export const HARBOR_FROSTED_BAR = `${HARBOR_FROSTED_LIGHT_FILL} border-b border-white/20`;

/** Icon well on elevated light cards (Tide flywheel, MV benchmark tiles). */
export const HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE =
  "flex shrink-0 items-center justify-center rounded-full border border-[#1E4775]/12 bg-[#1E4775]/[0.06]";

/** Large marketing / simple-view card shells (Earn, Sail basic grid). */
export const HARBOR_FROSTED_MARKET_CARD_SHELL = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;
