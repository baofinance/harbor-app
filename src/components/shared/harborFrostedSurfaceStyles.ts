/**
 * Frosted / elevated surfaces on the light Harbor canvas.
 * Cards are solid white with soft navy borders — dark mode can override later.
 */

import { HARBOR_THEME_CARD_SHADOW } from "@/components/shared/harborTheme";

/** Whitest card fill on light canvas. */
export const HARBOR_FROSTED_LIGHT_FILL = "bg-white";

/** Core elevated fill. */
export const HARBOR_FROSTED_FILL = HARBOR_FROSTED_LIGHT_FILL;

/** Lift + edge on light page backgrounds. */
export const HARBOR_FROSTED_EDGE =
  `border border-harbor-blue/10 ${HARBOR_THEME_CARD_SHADOW} ring-1 ring-harbor-blue/[0.04]`;

/** Full light card — chart, trade form, inner metric tiles. */
export const HARBOR_FROSTED_LIGHT_CARD = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_EDGE}`;

/** Standard elevated light card — Tide flywheel, Earn panels, basic market cards. */
export const HARBOR_FROSTED_LIGHT_CARD_ELEVATED =
  `rounded-xl ${HARBOR_FROSTED_LIGHT_CARD}`;

/** Rounded light card — alias of elevated shell for backward compatibility. */
export const HARBOR_FROSTED_LIGHT_CARD_ROUNDED = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

export const HARBOR_FROSTED_SURFACE = HARBOR_FROSTED_LIGHT_CARD;

/** Index table rows / headers. */
export const HARBOR_FROSTED_INDEX_EDGE =
  "border border-harbor-blue/12 shadow-sm ring-1 ring-harbor-blue/[0.04]";

export const HARBOR_FROSTED_INDEX_SURFACE = `${HARBOR_FROSTED_LIGHT_FILL} ${HARBOR_FROSTED_INDEX_EDGE}`;

export const HARBOR_FROSTED_SURFACE_HOVER =
  "transition-colors hover:bg-[#FAFBFD] hover:border-harbor-blue/15";

export const HARBOR_FROSTED_SURFACE_SELECTED =
  `${HARBOR_FROSTED_LIGHT_FILL} border border-harbor-blue/20 ${HARBOR_THEME_CARD_SHADOW} ring-1 ring-harbor-blue/10`;

/** Modal / dropdown panels. */
export const HARBOR_FROSTED_PANEL_FILL = HARBOR_FROSTED_LIGHT_FILL;

export const HARBOR_FROSTED_MODAL_SHELL = `${HARBOR_FROSTED_PANEL_FILL} border border-harbor-blue/15 shadow-2xl shadow-harbor-blue/10`;

export const HARBOR_FROSTED_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-harbor-blue/12 shadow-xl ring-1 ring-harbor-blue/5`;

/** Nav “More” burger menu. */
export const HARBOR_FROSTED_NAV_DROPDOWN_SHELL =
  `${HARBOR_FROSTED_PANEL_FILL} border border-harbor-blue/12 shadow-xl ring-1 ring-harbor-blue/8`;

/** Inner cards inside expanded rows / transparency grids. */
export const HARBOR_FROSTED_CARD_CLASS = HARBOR_FROSTED_LIGHT_CARD_ROUNDED;

/** Form controls on light panels. */
export const HARBOR_FROSTED_INPUT_FILL = "bg-[#F8FAFD] border border-harbor-blue/10";

/**
 * Selected chrome on light nav — white pill with navy text.
 */
export const HARBOR_FROSTED_ACTIVE_PILL = `${HARBOR_FROSTED_LIGHT_CARD} text-harbor-blue`;

export const HARBOR_FROSTED_PILL =
  "bg-white border border-harbor-blue/12 shadow-sm";

/** Top protocol banner bar. */
export const HARBOR_FROSTED_BAR = `${HARBOR_FROSTED_LIGHT_FILL} border-b border-harbor-blue/10`;

/** Icon well on elevated light cards. */
export const HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE =
  "flex shrink-0 items-center justify-center rounded-full border border-harbor-blue/12 bg-harbor-blue/[0.06]";

/** Large marketing / simple-view card shells. */
export const HARBOR_FROSTED_MARKET_CARD_SHELL = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;
