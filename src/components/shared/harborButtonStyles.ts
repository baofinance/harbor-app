/**
 * Shared button tiers for index pages and dashboard.
 */

import { HARBOR_FROSTED_INPUT_FILL } from "@/components/shared/harborFrostedSurfaceStyles";

const BTN_DISABLED =
  "disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

const BTN_BASE = `inline-flex items-center justify-center transition-colors rounded-md whitespace-nowrap ${BTN_DISABLED}`;

/** Primary navy — Manage, Claim on index rows. */
export const HARBOR_BTN_PRIMARY_DESKTOP_CLASS = `${BTN_BASE} min-w-[7rem] px-4 py-2 text-xs font-medium bg-harbor-blue text-white hover:bg-harbor-blue-dark`;

export const HARBOR_BTN_PRIMARY_COMPACT_CLASS = `${BTN_BASE} min-w-[5.25rem] px-3 py-1.5 text-[10px] font-medium bg-harbor-blue text-white hover:bg-harbor-blue-dark`;

export const HARBOR_BTN_PRIMARY_RESPONSIVE_CLASS = `${HARBOR_BTN_PRIMARY_COMPACT_CLASS} lg:min-w-[7rem] lg:px-4 lg:py-2 lg:text-xs`;

/** Coral — Anchor withdrawal actions. */
export const HARBOR_BTN_CORAL_DESKTOP_CLASS = `${BTN_BASE} min-w-[7rem] px-4 py-2 text-xs font-medium bg-harbor-coral text-white hover:bg-[#FF6B5A]`;

/** Frosted secondary — View all, dashboard links. */
export const HARBOR_BTN_SECONDARY_CLASS =
  `inline-flex shrink-0 items-center gap-1 rounded-md ${HARBOR_FROSTED_INPUT_FILL} px-2.5 py-1.5 text-[11px] font-semibold text-harbor-blue shadow-sm transition hover:bg-white/90 sm:px-3 sm:text-xs`;

/** Frosted outline — modal cancel. */
export const HARBOR_BTN_OUTLINE_DESKTOP_CLASS = `${BTN_BASE} min-w-[7rem] px-4 py-2 text-xs font-medium ${HARBOR_FROSTED_INPUT_FILL} border border-harbor-blue/35 text-harbor-blue hover:bg-harbor-blue/5`;

/** App hook for manage buttons (analytics / tests). */
export const HARBOR_BTN_PRIMARY_APP_CLASS = "app-index-manage-btn";

export const HARBOR_BTN_PRIMARY_DESKTOP_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_DESKTOP_CLASS}`;

export const HARBOR_BTN_PRIMARY_COMPACT_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_COMPACT_CLASS}`;

export const HARBOR_BTN_PRIMARY_RESPONSIVE_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_RESPONSIVE_CLASS}`;
