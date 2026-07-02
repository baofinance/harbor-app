/**
 * Top navigation chrome — light frosted bar with navy text.
 */

import {
  HARBOR_FROSTED_ACTIVE_PILL,
  HARBOR_FROSTED_DROPDOWN_SHELL,
  HARBOR_FROSTED_NAV_DROPDOWN_SHELL,
} from "@/components/shared/harborFrostedSurfaceStyles";
import { HARBOR_THEME_NAV_SHELL_CLASS } from "@/components/shared/harborTheme";

export { HARBOR_THEME_NAV_SHELL_CLASS as HARBOR_NAV_SHELL_CLASS };

/** Selected primary nav link — white pill on light nav. */
export const HARBOR_NAV_LINK_ACTIVE_CLASS =
  `${HARBOR_FROSTED_ACTIVE_PILL} rounded-md shadow-sm`;

/** Idle primary nav link. */
export const HARBOR_NAV_LINK_IDLE_CLASS =
  "text-harbor-blue/75 transition-colors hover:bg-harbor-blue/5 hover:text-harbor-blue";

/** Mobile nav pill — idle. */
export const HARBOR_NAV_MOBILE_LINK_IDLE_CLASS =
  "text-harbor-blue bg-harbor-blue/5 transition-colors hover:bg-harbor-blue/10";

/** Segmented control track (Theme, UI / UI+). */
export const HARBOR_NAV_SEGMENT_SHELL_CLASS = "rounded-md bg-harbor-blue/5 p-0.5";

/** Selected segment — white glass pill. */
export const HARBOR_NAV_SEGMENT_ACTIVE_CLASS =
  `${HARBOR_FROSTED_ACTIVE_PILL} rounded-md px-2 py-2 text-sm font-medium shadow-sm`;

/** Idle segment. */
export const HARBOR_NAV_SEGMENT_IDLE_CLASS =
  "rounded px-2 py-2 text-sm font-medium text-harbor-blue/70 transition-colors hover:bg-harbor-blue/5 hover:text-harbor-blue";

/** Theme dropdown trigger. */
export const HARBOR_NAV_THEME_TRIGGER_CLASS = `h-9 w-full cursor-pointer rounded-md px-1.5 py-0 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-harbor-blue/20 ${HARBOR_FROSTED_ACTIVE_PILL}`;

/** Connect / account chip in nav bar. */
export const HARBOR_NAV_WALLET_CHIP_CLASS =
  "relative inline-flex items-center gap-3 rounded-md bg-white px-2.5 py-2 text-sm font-medium text-harbor-blue shadow-sm border border-harbor-blue/10 hover:bg-[#FAFBFD] sm:px-3";

/** More-menu popover shell. */
export const HARBOR_NAV_POPOVER_SHELL_CLASS = HARBOR_FROSTED_NAV_DROPDOWN_SHELL;

/** More-menu item — active. */
export const HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  "bg-harbor-blue/10 text-harbor-blue";

/** More-menu item — idle. */
export const HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS =
  "bg-white text-harbor-blue hover:bg-harbor-blue/5";

/** Burger / icon control on light nav. */
export const HARBOR_NAV_ICON_BUTTON_CLASS =
  "rounded-md p-2 text-harbor-blue/75 transition-colors hover:bg-harbor-blue/5 hover:text-harbor-blue focus:outline-2 focus:-outline-offset-1 focus:outline-harbor-blue/25";

/** Mobile menu close / open — coral hover accent. */
export const HARBOR_NAV_MOBILE_MENU_BUTTON_CLASS =
  "rounded-md p-2 text-harbor-blue/70 transition-colors hover:bg-harbor-coral/15 hover:text-harbor-coral focus:outline-2 focus:-outline-offset-1 focus:outline-harbor-coral/40";

/** Wallet modal overlay — portaled to `document.body`. */
export const HARBOR_NAV_WALLET_MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-[120] flex items-center justify-center p-4";

/** Wallet modal shell — light card (refresh). */
export const HARBOR_NAV_WALLET_MODAL_SHELL_CLASS =
  "relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white border border-harbor-blue/12 shadow-2xl shadow-harbor-blue/10";

/** Wallet modal section header strip. */
export const HARBOR_NAV_WALLET_MODAL_HEADER_CLASS = "px-6 py-4 bg-[#F8FAFD] border-b border-harbor-blue/10";

export const HARBOR_NAV_WALLET_MODAL_TITLE_CLASS =
  "text-base font-semibold text-harbor-blue lg:text-xl";

/** Close control on wallet modal. */
export const HARBOR_NAV_WALLET_MODAL_CLOSE_CLASS =
  "absolute top-3 right-3 z-10 inline-flex items-center rounded-md bg-transparent p-1.5 text-sm text-harbor-blue/70 transition hover:bg-harbor-blue/5 hover:text-harbor-blue";

/** Inset panel inside wallet modal. */
export const HARBOR_NAV_WALLET_INSET_PANEL_CLASS = "rounded-md bg-harbor-blue/[0.04] border border-harbor-blue/8 p-3";

/** Wallet modal action row button (copy, disconnect). */
export const HARBOR_NAV_WALLET_ACTION_CLASS =
  "rounded-md bg-harbor-blue/5 px-3 py-2 text-xs text-harbor-blue hover:bg-harbor-blue/10";

/** Network row — selected in wallet modal. */
export const HARBOR_NAV_NETWORK_ACTIVE_CLASS =
  "flex w-full cursor-default items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-harbor-blue shadow-md ring-2 ring-harbor-blue/25 border border-harbor-blue/15";

/** Network row — idle in wallet modal. */
export const HARBOR_NAV_NETWORK_IDLE_CLASS =
  "flex w-full items-center gap-2 rounded-md bg-[#F4F7FB] px-3 py-2 text-sm font-medium text-harbor-blue transition-colors hover:bg-harbor-blue/5 border border-harbor-blue/8";

/** Wallet connector option in connect modal. */
export const HARBOR_NAV_WALLET_OPTION_CLASS =
  "flex w-full items-center gap-2 rounded-md bg-harbor-blue/5 px-3 py-2 text-md text-harbor-blue enabled:hover:bg-harbor-coral/10 disabled:opacity-50";
