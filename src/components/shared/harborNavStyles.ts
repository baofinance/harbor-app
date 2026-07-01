/**
 * Top navigation chrome — white frosted pill on the active route only;
 * idle links and controls use the original translucent-on-navy treatment.
 */

import {
  HARBOR_FROSTED_ACTIVE_PILL,
  HARBOR_FROSTED_DROPDOWN_SHELL,
  HARBOR_FROSTED_NAV_DROPDOWN_SHELL,
} from "@/components/shared/harborFrostedSurfaceStyles";

/** Selected primary nav link — white glass pill (Earn basic market card surface). */
export const HARBOR_NAV_LINK_ACTIVE_CLASS =
  `${HARBOR_FROSTED_ACTIVE_PILL} rounded-md`;

/** Idle primary nav link — plain white text on navy header. */
export const HARBOR_NAV_LINK_IDLE_CLASS =
  "text-white transition-colors hover:bg-white/20 hover:text-white";

/** Mobile nav pill — idle. */
export const HARBOR_NAV_MOBILE_LINK_IDLE_CLASS =
  "text-white bg-white/10 transition-colors hover:bg-white/20";

/** Segmented control track (Theme, UI / UI+). */
export const HARBOR_NAV_SEGMENT_SHELL_CLASS = "rounded-md bg-white/10 p-0.5";

/** Selected segment — white glass pill (matches active nav link). */
export const HARBOR_NAV_SEGMENT_ACTIVE_CLASS =
  `${HARBOR_FROSTED_ACTIVE_PILL} rounded-md px-2 py-2 text-sm font-medium`;

/** Idle segment. */
export const HARBOR_NAV_SEGMENT_IDLE_CLASS =
  "rounded px-2 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20";

/** Theme dropdown trigger — always frosted white (reference “white glass” control). */
export const HARBOR_NAV_THEME_TRIGGER_CLASS = `h-9 w-full cursor-pointer rounded-md px-1.5 py-0 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1E4775]/20 ${HARBOR_FROSTED_ACTIVE_PILL}`;

/** Connect / account chip in nav bar. */
export const HARBOR_NAV_WALLET_CHIP_CLASS =
  "relative inline-flex items-center gap-3 rounded-md bg-white/90 px-2.5 py-2 text-sm font-medium text-[#1E4775] shadow-sm backdrop-blur-sm hover:bg-white/90 sm:px-3";

/** More-menu popover shell. */
export const HARBOR_NAV_POPOVER_SHELL_CLASS = HARBOR_FROSTED_NAV_DROPDOWN_SHELL;

/** More-menu item — active. */
export const HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  "bg-[#1E4775]/10 text-[#1E4775]";

/** More-menu item — idle. */
export const HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS =
  "bg-white text-[#1E4775] hover:bg-gray-100";

/** Burger / icon control on dark nav. */
export const HARBOR_NAV_ICON_BUTTON_CLASS =
  "rounded-md p-2 text-white transition-colors hover:bg-white/20 focus:outline-2 focus:-outline-offset-1 focus:outline-white/40";

/** Mobile menu close / open — coral hover accent. */
export const HARBOR_NAV_MOBILE_MENU_BUTTON_CLASS =
  "rounded-md p-2 text-gray-200 transition-colors hover:bg-[#FF8A7A]/20 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-[#FF8A7A]";

/** Wallet modal overlay — portaled to `document.body` so page glass stacks below. */
export const HARBOR_NAV_WALLET_MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-[120] flex items-center justify-center p-4";

/** Wallet modal shell — navy card (classic connect UI). */
export const HARBOR_NAV_WALLET_MODAL_SHELL_CLASS =
  "relative flex w-full max-w-md flex-col overflow-hidden rounded-lg bg-[#1E4775] shadow-lg";

/** Wallet modal section header strip. */
export const HARBOR_NAV_WALLET_MODAL_HEADER_CLASS = "px-6 py-4 bg-[#153A5F]";

export const HARBOR_NAV_WALLET_MODAL_TITLE_CLASS =
  "text-base font-semibold text-white lg:text-xl";

/** Close control on navy wallet modal. */
export const HARBOR_NAV_WALLET_MODAL_CLOSE_CLASS =
  "absolute top-3 right-3 z-10 inline-flex items-center rounded-md bg-transparent p-1.5 text-sm text-white transition hover:bg-[#153A5F] hover:text-gray-200";

/** Inset panel inside wallet modal (balance, etc.). */
export const HARBOR_NAV_WALLET_INSET_PANEL_CLASS = "rounded-md bg-white/5 p-3";

/** Wallet modal action row button (copy, disconnect). */
export const HARBOR_NAV_WALLET_ACTION_CLASS =
  "rounded-md bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20";

/** Network row — selected in wallet modal. */
export const HARBOR_NAV_NETWORK_ACTIVE_CLASS =
  "flex w-full cursor-default items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-[#1E4775] shadow-md ring-2 ring-[#1E4775]/40";

/** Network row — idle in wallet modal. */
export const HARBOR_NAV_NETWORK_IDLE_CLASS =
  "flex w-full items-center gap-2 rounded-md bg-gray-300 px-3 py-2 text-sm font-medium text-[#1E4775] transition-colors hover:bg-gray-400";

/** Wallet connector option in connect modal. */
export const HARBOR_NAV_WALLET_OPTION_CLASS =
  "flex w-full items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-md text-white enabled:hover:bg-[#FF8A7A]/20 disabled:opacity-50";
