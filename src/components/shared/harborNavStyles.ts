/**
 * Glass chrome for the top navigation bar — white frosted pills on dark Harbor header,
 * matching Earn / Sail basic market cards (`HARBOR_FROSTED_LIGHT_CARD_*`).
 */

import {
  HARBOR_BTN_GLASS_LIGHT_HOVER,
  HARBOR_BTN_GLASS_LIGHT_SURFACE,
  HARBOR_BTN_GLASS_NAVY_LIGHT,
  HARBOR_BTN_GLASS_OUTLINE_LIGHT,
  HARBOR_BTN_GLASS_SEGMENT_ACTIVE_LIGHT,
} from "@/components/shared/harborButtonStyles";
import {
  HARBOR_FROSTED_ACTIVE_PILL,
  HARBOR_FROSTED_LIGHT_FILL,
  HARBOR_FROSTED_MODAL_SHELL,
  HARBOR_FROSTED_NAV_DROPDOWN_SHELL,
  HARBOR_FROSTED_PILL,
} from "@/components/shared/harborFrostedSurfaceStyles";

/** Compact white frosted idle pill — nav scale, same family as market cards. */
const HARBOR_NAV_IDLE_PILL =
  `${HARBOR_FROSTED_LIGHT_FILL} border border-[#1E4775]/12 shadow-sm ring-1 ring-[#1E4775]/6 text-[#1E4775]/85`;

/** Selected primary nav link. */
export const HARBOR_NAV_LINK_ACTIVE_CLASS = HARBOR_FROSTED_ACTIVE_PILL;

/** Idle primary nav link. */
export const HARBOR_NAV_LINK_IDLE_CLASS = `${HARBOR_NAV_IDLE_PILL} transition-colors hover:border-[#1E4775]/22 hover:bg-white/92 hover:text-[#1E4775]`;

/** Mobile nav pill — idle. */
export const HARBOR_NAV_MOBILE_LINK_IDLE_CLASS = `${HARBOR_NAV_IDLE_PILL} text-[#1E4775] transition-colors hover:bg-white/92`;

/** Segmented control track (Theme, UI / UI+). */
export const HARBOR_NAV_SEGMENT_SHELL_CLASS =
  `${HARBOR_FROSTED_LIGHT_FILL} rounded-md border border-[#1E4775]/12 p-0.5 shadow-sm ring-1 ring-[#1E4775]/6 backdrop-blur-lg backdrop-saturate-150`;

/** Selected segment. */
export const HARBOR_NAV_SEGMENT_ACTIVE_CLASS = HARBOR_BTN_GLASS_SEGMENT_ACTIVE_LIGHT;

/** Idle segment. */
export const HARBOR_NAV_SEGMENT_IDLE_CLASS =
  "rounded px-2 py-2 text-sm font-medium text-[#1E4775]/70 transition-colors hover:bg-[#1E4775]/5 hover:text-[#1E4775]";

/** Theme dropdown trigger. */
export const HARBOR_NAV_THEME_TRIGGER_CLASS = `h-9 w-full rounded border-[#1E4775]/30 px-1.5 py-0 text-sm font-medium text-[#1E4775] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25 ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

/** Connect / account chip in nav bar. */
export const HARBOR_NAV_WALLET_CHIP_CLASS = `rounded-md px-2.5 sm:px-3 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Maiden Voyage version badge — active route. */
export const HARBOR_NAV_VERSION_BADGE_ACTIVE_CLASS =
  "rounded border border-[#1E4775]/35 bg-white/80 px-1 py-0.5 text-[10px] font-bold leading-none font-mono text-[#1E4775] backdrop-blur-sm";

/** Maiden Voyage version badge — idle route. */
export const HARBOR_NAV_VERSION_BADGE_IDLE_CLASS =
  `${HARBOR_FROSTED_PILL} rounded px-1 py-0.5 text-[10px] font-bold leading-none font-mono text-[#1E4775]`;

/** More-menu popover shell. */
export const HARBOR_NAV_POPOVER_SHELL_CLASS = HARBOR_FROSTED_NAV_DROPDOWN_SHELL;

/** More-menu item — active. */
export const HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  "border-l-2 border-[#1E4775]/40 bg-[#1E4775]/[0.08] text-[#1E4775]";

/** More-menu item — idle. */
export const HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS =
  "bg-transparent text-[#1E4775] hover:bg-[#1E4775]/5";

/** Burger / icon control. */
export const HARBOR_NAV_ICON_BUTTON_CLASS = `rounded-md p-2 text-[#1E4775] transition-colors ${HARBOR_BTN_GLASS_LIGHT_SURFACE} border-[#1E4775]/20 ${HARBOR_BTN_GLASS_LIGHT_HOVER}`;

/** Wallet modal shell. */
export const HARBOR_NAV_WALLET_MODAL_SHELL_CLASS = HARBOR_FROSTED_MODAL_SHELL;

/** Wallet modal header strip. */
export const HARBOR_NAV_WALLET_MODAL_HEADER_CLASS =
  "border-b border-[#1E4775]/12 bg-white/70 px-6 py-4 backdrop-blur-md";

/** Inset panel inside wallet modal (balance, etc.). */
export const HARBOR_NAV_WALLET_INSET_PANEL_CLASS =
  "rounded-md border border-[#1E4775]/12 bg-[#1E4775]/[0.04] p-3 backdrop-blur-sm";

/** Wallet modal action row button. */
export const HARBOR_NAV_WALLET_ACTION_CLASS = `rounded-md px-3 py-2 text-sm ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Network row — selected in wallet modal. */
export const HARBOR_NAV_NETWORK_ACTIVE_CLASS = `flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

/** Network row — idle in wallet modal. */
export const HARBOR_NAV_NETWORK_IDLE_CLASS = `flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Wallet connector option in connect modal. */
export const HARBOR_NAV_WALLET_OPTION_CLASS = `flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;
