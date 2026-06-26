/**
 * Frosted white surfaces — reads as white on dark Harbor chrome with glass coherence.
 * Use for cards, rows, modals, dropdowns, nav pills (not toggle thumbs or text).
 */

/** Core frosted fill. */
export const HARBOR_FROSTED_FILL =
  "bg-white/80 backdrop-blur-md backdrop-saturate-150";

/** Lift + glass edge on dark page backgrounds. */
export const HARBOR_FROSTED_EDGE =
  "border border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/8";

export const HARBOR_FROSTED_SURFACE = `${HARBOR_FROSTED_FILL} ${HARBOR_FROSTED_EDGE}`;

/** Index table rows / headers — harbor-blue border family. */
export const HARBOR_FROSTED_INDEX_EDGE =
  "border border-harbor-blue/15 shadow-sm ring-1 ring-[#1E4775]/6";

export const HARBOR_FROSTED_INDEX_SURFACE = `${HARBOR_FROSTED_FILL} ${HARBOR_FROSTED_INDEX_EDGE}`;

export const HARBOR_FROSTED_SURFACE_HOVER =
  "transition-colors hover:bg-white/88";

export const HARBOR_FROSTED_SURFACE_SELECTED =
  "bg-white/90 backdrop-blur-md backdrop-saturate-150 border border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.78),0_10px_28px_-18px_rgba(0,0,0,0.32)] ring-1 ring-[#1E4775]/10";

/** Modal / dropdown panels — slightly more opaque for legibility. */
export const HARBOR_FROSTED_PANEL_FILL =
  "bg-white/88 backdrop-blur-lg backdrop-saturate-150";

export const HARBOR_FROSTED_MODAL_SHELL = `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/20 shadow-2xl shadow-black/10`;

export const HARBOR_FROSTED_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-[#1E4775]/12 shadow-xl ring-1 ring-black/5`;

/** Inner cards inside expanded rows / transparency grids. */
export const HARBOR_FROSTED_CARD_CLASS = `${HARBOR_FROSTED_INDEX_SURFACE} rounded-md`;

/** Form controls on frosted panels. */
export const HARBOR_FROSTED_INPUT_FILL = "bg-white/85 backdrop-blur-sm";

/** Active nav pill, segmented toggle selected, tab selected, etc. */
export const HARBOR_FROSTED_ACTIVE_PILL =
  "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm";

export const HARBOR_FROSTED_PILL =
  "bg-white/85 backdrop-blur-sm shadow-sm ring-1 ring-white/35";

/** Top protocol banner bar. */
export const HARBOR_FROSTED_BAR = `${HARBOR_FROSTED_FILL} backdrop-blur-md border-b border-white/20`;

/** Large marketing / simple-view card shells (Earn, Sail basic grid). */
export const HARBOR_FROSTED_MARKET_CARD_SHELL =
  "rounded-3xl border border-[#1E4775]/12 bg-white/82 backdrop-blur-md backdrop-saturate-150 shadow-xl shadow-black/[0.06] ring-1 ring-white/25";
