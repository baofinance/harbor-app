/**
 * Frosted white surfaces — reads as white on dark Harbor chrome with glass coherence.
 * Use for cards, rows, modals, dropdowns, nav pills (not toggle thumbs or text).
 */

/** Translucent glass fill — lets dark chrome bleed through blur for depth. */
export const HARBOR_FROSTED_LIGHT_FILL =
  "bg-gradient-to-b from-white/80 via-white/68 to-white/58 backdrop-blur-xl backdrop-saturate-150";

/** Core frosted fill (alias of light fill for shared surfaces). */
export const HARBOR_FROSTED_FILL = HARBOR_FROSTED_LIGHT_FILL;

/** Lift + specular glass edge on dark page backgrounds. */
export const HARBOR_FROSTED_EDGE =
  "border border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.88),inset_0_0_0_1px_rgba(255,255,255,0.12),0_14px_36px_-18px_rgba(0,0,0,0.38)] ring-1 ring-[#1E4775]/6";

/** Full light card on dark chrome — chart, trade form, inner metric tiles. */
export const HARBOR_FROSTED_LIGHT_CARD = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_EDGE}`;

/** Standard elevated light card — Tide flywheel, Earn panels, basic market cards. */
export const HARBOR_FROSTED_LIGHT_CARD_ELEVATED =
  `rounded-xl ${HARBOR_FROSTED_LIGHT_CARD} ring-1 ring-white/25`;

/** Rounded light card — alias of elevated shell for backward compatibility. */
export const HARBOR_FROSTED_LIGHT_CARD_ROUNDED = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

export const HARBOR_FROSTED_SURFACE = HARBOR_FROSTED_LIGHT_CARD;

/** Index table rows / headers — harbor-blue border family with glass rim. */
export const HARBOR_FROSTED_INDEX_EDGE =
  "border border-white/32 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.82),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/8";

export const HARBOR_FROSTED_INDEX_SURFACE = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_INDEX_EDGE}`;

export const HARBOR_FROSTED_SURFACE_HOVER =
  "transition-[background-color,border-color,box-shadow] duration-200 hover:border-white/45 hover:from-white/86 hover:via-white/74 hover:to-white/64 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.94),0_16px_40px_-16px_rgba(0,0,0,0.42)]";

export const HARBOR_FROSTED_SURFACE_SELECTED =
  `${HARBOR_FROSTED_LIGHT_FILL} border border-white/42 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92),0_14px_36px_-18px_rgba(0,0,0,0.38)] ring-1 ring-white/30`;

/** Modal / dropdown panels. */
export const HARBOR_FROSTED_PANEL_FILL = HARBOR_FROSTED_LIGHT_FILL;

export const HARBOR_FROSTED_MODAL_SHELL = `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/20 shadow-2xl shadow-black/10`;

export const HARBOR_FROSTED_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/12 shadow-xl ring-1 ring-black/5`;

/** Nav “More” burger menu — solid white panel over navy header (no bleed-through). */
export const HARBOR_FROSTED_NAV_DROPDOWN_SHELL =
  "bg-white border border-[#1E4775]/15 shadow-xl ring-1 ring-[#1E4775]/8";

/** Inner cards inside expanded rows / transparency grids. */
export const HARBOR_FROSTED_CARD_CLASS = HARBOR_FROSTED_LIGHT_CARD_ROUNDED;

/** Form controls on frosted panels — nested glass inset. */
export const HARBOR_FROSTED_INPUT_FILL =
  "border border-white/25 bg-white/45 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(30,71,117,0.06)]";

/** Active nav pill, segmented toggle selected, tab selected, etc. */
export const HARBOR_FROSTED_ACTIVE_PILL =
  "border border-white/35 bg-white/75 backdrop-blur-md text-[#1E4775] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]";

export const HARBOR_FROSTED_PILL =
  "border border-white/30 bg-white/55 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] ring-1 ring-white/20";

/** Top protocol banner bar. */
export const HARBOR_FROSTED_BAR = `${HARBOR_FROSTED_LIGHT_FILL} border-b border-white/20`;

/** Icon well on elevated light cards (Tide flywheel, MV benchmark tiles). */
export const HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE =
  "flex shrink-0 items-center justify-center rounded-full border border-[#1E4775]/12 bg-[#1E4775]/[0.06]";

/** Large marketing / simple-view card shells (Earn, Sail basic grid). */
export const HARBOR_FROSTED_MARKET_CARD_SHELL = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;
