/**
 * Glass chrome for the top navigation bar — links, toggles, wallet chip, dropdowns.
 */

import {
  HARBOR_BTN_GLASS_DARK_SURFACE,
  HARBOR_BTN_GLASS_NAVY_LIGHT,
  HARBOR_BTN_GLASS_OUTLINE_LIGHT,
  HARBOR_BTN_GLASS_SEGMENT_ACTIVE_DARK,
} from "@/components/shared/harborButtonStyles";
import {
  HARBOR_FROSTED_DROPDOWN_SHELL,
  HARBOR_FROSTED_MODAL_SHELL,
} from "@/components/shared/harborFrostedSurfaceStyles";

/** Selected primary nav link on dark header. */
export const HARBOR_NAV_LINK_ACTIVE_CLASS =
  "bg-white/88 backdrop-blur-md backdrop-saturate-150 text-[#1E4775] border border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72),0_4px_16px_-12px_rgba(0,0,0,0.28)] ring-1 ring-[#1E4775]/10";

/** Idle primary nav link on dark header. */
export const HARBOR_NAV_LINK_IDLE_CLASS =
  "border border-transparent text-white hover:border-white/20 hover:bg-white/[0.08] backdrop-blur-sm";

/** Mobile nav pill — idle. */
export const HARBOR_NAV_MOBILE_LINK_IDLE_CLASS =
  "border border-white/15 bg-white/[0.06] text-white backdrop-blur-md hover:border-white/25 hover:bg-white/[0.12]";

/** Segmented control track (Theme, UI / UI+). */
export const HARBOR_NAV_SEGMENT_SHELL_CLASS =
  "rounded-md border border-white/15 bg-white/[0.06] p-0.5 backdrop-blur-md";

/** Selected segment on dark nav chrome. */
export const HARBOR_NAV_SEGMENT_ACTIVE_CLASS = HARBOR_BTN_GLASS_SEGMENT_ACTIVE_DARK;

/** Idle segment on dark nav chrome. */
export const HARBOR_NAV_SEGMENT_IDLE_CLASS =
  "rounded px-2 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]";

/** Theme dropdown trigger on dark nav. */
export const HARBOR_NAV_THEME_TRIGGER_CLASS = `h-9 w-full rounded border-[#1E4775]/30 px-1.5 py-0 text-sm font-medium text-[#1E4775] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25 ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

/** Connect / account chip in nav bar. */
export const HARBOR_NAV_WALLET_CHIP_CLASS = `rounded-md px-2.5 sm:px-3 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Maiden Voyage version badge — active route. */
export const HARBOR_NAV_VERSION_BADGE_ACTIVE_CLASS =
  "rounded border border-[#1E4775]/35 bg-white/80 px-1 py-0.5 text-[10px] font-bold leading-none font-mono text-[#1E4775] backdrop-blur-sm";

/** Maiden Voyage version badge — idle route. */
export const HARBOR_NAV_VERSION_BADGE_IDLE_CLASS =
  "rounded border border-white/30 bg-white/[0.08] px-1 py-0.5 text-[10px] font-bold leading-none font-mono text-white backdrop-blur-sm";

/** More-menu popover shell. */
export const HARBOR_NAV_POPOVER_SHELL_CLASS = `${HARBOR_FROSTED_DROPDOWN_SHELL} backdrop-blur-lg backdrop-saturate-150`;

/** More-menu item — active. */
export const HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  "border-l-2 border-[#1E4775]/40 bg-[#1E4775]/[0.08] text-[#1E4775] backdrop-blur-sm";

/** More-menu item — idle. */
export const HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS =
  "bg-transparent text-[#1E4775] hover:bg-white/70 backdrop-blur-sm";

/** Burger / icon control on dark nav. */
export const HARBOR_NAV_ICON_BUTTON_CLASS = `rounded-md p-2 text-white transition-colors ${HARBOR_BTN_GLASS_DARK_SURFACE} hover:border-white/35 hover:bg-white/[0.14]`;

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
