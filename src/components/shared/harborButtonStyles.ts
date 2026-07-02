/**
 * Shared glass button tiers for index pages, product surfaces, and dashboard.
 */

import {
  HARBOR_FROSTED_ACTIVE_PILL,
  HARBOR_FROSTED_INPUT_FILL,
} from "@/components/shared/harborFrostedSurfaceStyles";

const BTN_FOCUS_LIGHT =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/25";

const BTN_FOCUS_DARK =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25";

const BTN_DISABLED_LIGHT =
  "disabled:cursor-not-allowed disabled:border-[#CBD5E1] disabled:bg-[#F8FAFC]/90 disabled:text-[#94a3b8] disabled:shadow-none";

const BTN_DISABLED_DARK =
  "disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35 disabled:opacity-45 disabled:shadow-none";

const BTN_BASE = `inline-flex items-center justify-center transition-colors whitespace-nowrap ${BTN_FOCUS_LIGHT}`;

/** Frosted fill on light panels (Earn / Sail / Tide cards). */
export const HARBOR_BTN_GLASS_LIGHT_SURFACE = `${HARBOR_FROSTED_INPUT_FILL} border shadow-sm backdrop-blur-sm`;

export const HARBOR_BTN_GLASS_LIGHT_HOVER =
  "hover:border-[#1E4775]/45 hover:bg-white/95";

/** Frosted fill on dark Harbor chrome (Maiden Voyage, mobile trade bar). */
export const HARBOR_BTN_GLASS_DARK_SURFACE =
  "border border-white/22 bg-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]";

export const HARBOR_BTN_GLASS_DARK_HOVER =
  "hover:border-white/35 hover:bg-white/[0.14]";

/** Navy accent on light frosted panels. */
export const HARBOR_BTN_GLASS_NAVY_LIGHT = `${BTN_BASE} ${BTN_DISABLED_LIGHT} ${HARBOR_BTN_GLASS_LIGHT_SURFACE} ${HARBOR_BTN_GLASS_LIGHT_HOVER} border-[#1E4775]/40 font-semibold text-[#1E4775]`;

/** Mint accent on light frosted panels. */
export const HARBOR_BTN_GLASS_MINT_LIGHT = `${BTN_BASE} ${BTN_DISABLED_LIGHT} ${HARBOR_BTN_GLASS_LIGHT_SURFACE} font-semibold text-[#2d6b5c] border-[#4A9784]/45 hover:border-[#4A9784]/60 hover:bg-white/95`;

/** Coral accent on light frosted panels. */
export const HARBOR_BTN_GLASS_CORAL_LIGHT = `${BTN_BASE} ${BTN_DISABLED_LIGHT} ${HARBOR_BTN_GLASS_LIGHT_SURFACE} font-semibold text-harbor-coral border-harbor-coral/45 hover:border-harbor-coral/60 hover:bg-white/95`;

/** Solid coral CTA — white label on harbor coral (Earn claim actions). */
export const HARBOR_BTN_SOLID_CORAL_BASE = `${BTN_BASE} border border-harbor-coral bg-harbor-coral font-semibold text-white hover:border-[#FF6B5A] hover:bg-[#FF6B5A] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none`;

/** Secondary / cancel on light panels. */
export const HARBOR_BTN_GLASS_OUTLINE_LIGHT = `${BTN_BASE} ${BTN_DISABLED_LIGHT} ${HARBOR_BTN_GLASS_LIGHT_SURFACE} border-[#1E4775]/30 font-semibold text-[#1E4775] hover:border-[#1E4775]/45 hover:bg-white/95`;

/** Coral CTA on dark glass (Maiden Voyage hero). */
export const HARBOR_BTN_GLASS_CORAL_DARK = `inline-flex items-center justify-center transition-colors whitespace-nowrap ${BTN_FOCUS_DARK} ${BTN_DISABLED_DARK} ${HARBOR_BTN_GLASS_DARK_SURFACE} border-[#FF8A7A]/45 bg-[#FF8A7A]/[0.14] font-semibold text-white hover:border-[#FF8A7A]/60 hover:bg-[#FF8A7A]/[0.22]`;

/** Mint on dark glass. */
export const HARBOR_BTN_GLASS_MINT_DARK = `inline-flex items-center justify-center transition-colors whitespace-nowrap ${BTN_FOCUS_DARK} ${BTN_DISABLED_DARK} ${HARBOR_BTN_GLASS_DARK_SURFACE} border-[#4A9784]/45 bg-[#4A9784]/[0.12] font-semibold text-[#B8EBD5] hover:border-[#4A9784]/60 hover:bg-[#4A9784]/[0.2]`;

/** Navy on dark glass. */
export const HARBOR_BTN_GLASS_NAVY_DARK = `inline-flex items-center justify-center transition-colors whitespace-nowrap ${BTN_FOCUS_DARK} ${BTN_DISABLED_DARK} ${HARBOR_BTN_GLASS_DARK_SURFACE} border-white/25 font-semibold text-white/95 hover:border-white/40`;

/** Compact icon control on dark glass. */
export const HARBOR_BTN_GLASS_ICON_DARK =
  `inline-flex items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.12] hover:text-white ${BTN_FOCUS_DARK}`;

/** Full-width primary CTAs on light cards. */
export const HARBOR_BTN_GLASS_CTA_FULL_NAVY_CLASS = `w-full rounded-xl px-4 py-3 text-sm ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

export const HARBOR_BTN_GLASS_CTA_FULL_MINT_CLASS = `w-full rounded-xl px-4 py-3 text-sm ${HARBOR_BTN_GLASS_MINT_LIGHT}`;

export const HARBOR_BTN_GLASS_CTA_FULL_CORAL_LIGHT_CLASS = `w-full rounded-xl px-4 py-3 text-sm ${HARBOR_BTN_GLASS_CORAL_LIGHT}`;

/** Denser genesis / table CTAs. */
export const HARBOR_BTN_GLASS_CTA_COMPACT_NAVY_CLASS = `w-full rounded-xl px-3.5 py-2.5 text-xs ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

export const HARBOR_BTN_GLASS_CTA_COMPACT_OUTLINE_CLASS = `w-full rounded-xl px-3.5 py-2.5 text-xs ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Max chip on amount inputs. */
export const HARBOR_BTN_GLASS_MAX_CHIP_CLASS = `rounded-md px-3 py-1.5 text-sm font-medium ${HARBOR_BTN_GLASS_CORAL_LIGHT}`;

export const HARBOR_BTN_GLASS_MAX_CHIP_ROUND_CLASS = `absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-sm font-medium ${HARBOR_BTN_GLASS_CORAL_LIGHT}`;

/** Pill-shaped pair actions (claim / compound rows). */
export const HARBOR_BTN_GLASS_PILL_NAVY_CLASS = `flex-1 rounded-full px-4 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_NAVY_LIGHT}`;

export const HARBOR_BTN_GLASS_PILL_OUTLINE_CLASS = `flex-1 rounded-full px-4 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

export const HARBOR_BTN_GLASS_PILL_CORAL_CLASS = `flex-1 rounded-full px-4 py-2 text-sm font-medium ${HARBOR_BTN_GLASS_CORAL_LIGHT}`;

export const HARBOR_BTN_GLASS_PILL_CORAL_DARK_CLASS = `inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold ${HARBOR_BTN_GLASS_CORAL_DARK}`;

export const HARBOR_BTN_GLASS_PILL_OUTLINE_DARK_CLASS = `rounded-full border border-white/22 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40 ${BTN_FOCUS_DARK}`;

export const HARBOR_BTN_GLASS_PILL_DISABLED_CLASS =
  "flex-1 cursor-not-allowed rounded-full border border-[#CBD5E1] bg-[#F8FAFC]/90 px-4 py-2 text-sm font-medium text-[#94a3b8]";

export const HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS = `rounded-full px-4 py-1.5 text-sm ${HARBOR_BTN_GLASS_CORAL_LIGHT}`;

export const HARBOR_BTN_GLASS_COMPACT_OUTLINE_CLASS = `rounded-full px-4 py-1.5 text-sm ${HARBOR_BTN_GLASS_OUTLINE_LIGHT}`;

/** Segmented control — selected segment on light chrome. */
export const HARBOR_BTN_GLASS_SEGMENT_ACTIVE_LIGHT = `${HARBOR_FROSTED_ACTIVE_PILL} rounded-md border border-[#1E4775]/20 px-3 py-1.5 text-xs font-semibold text-[#1E4775]`;

/** Segmented control — selected segment on dark chrome. */
export const HARBOR_BTN_GLASS_SEGMENT_ACTIVE_DARK = `${HARBOR_FROSTED_ACTIVE_PILL} rounded px-3 py-1 text-xs font-semibold text-[#1E4775]`;

/** Primary navy — Manage, Claim on index rows. */
export const HARBOR_BTN_PRIMARY_DESKTOP_CLASS = `${HARBOR_BTN_GLASS_NAVY_LIGHT} min-w-[7rem] rounded-md px-4 py-2 text-xs`;

export const HARBOR_BTN_PRIMARY_COMPACT_CLASS = `${HARBOR_BTN_GLASS_NAVY_LIGHT} min-w-[5.25rem] rounded-md px-3 py-1.5 text-[10px]`;

export const HARBOR_BTN_PRIMARY_RESPONSIVE_CLASS = `${HARBOR_BTN_PRIMARY_COMPACT_CLASS} lg:min-w-[7rem] lg:px-4 lg:py-2 lg:text-xs`;

/** Coral — Anchor withdrawal actions. */
export const HARBOR_BTN_CORAL_DESKTOP_CLASS = `${HARBOR_BTN_GLASS_CORAL_LIGHT} min-w-[7rem] rounded-md px-4 py-2 text-xs`;

/** Solid coral — Earn claim actions. */
export const HARBOR_BTN_SOLID_CORAL_DESKTOP_CLASS = `${HARBOR_BTN_SOLID_CORAL_BASE} min-w-[7rem] rounded-md px-4 py-2 text-xs`;

export const HARBOR_BTN_SOLID_CORAL_PILL_CLASS = `flex-1 rounded-full px-4 py-2 text-sm font-medium ${HARBOR_BTN_SOLID_CORAL_BASE}`;

export const HARBOR_BTN_SOLID_CORAL_COMPACT_PILL_CLASS = `rounded-full px-3 py-1 text-xs font-medium ${HARBOR_BTN_SOLID_CORAL_BASE}`;

/** Frosted secondary — View all, dashboard links. */
export const HARBOR_BTN_SECONDARY_CLASS = `${HARBOR_BTN_GLASS_OUTLINE_LIGHT} shrink-0 gap-1 rounded-md px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-xs`;

/** Frosted outline — modal cancel. */
export const HARBOR_BTN_OUTLINE_DESKTOP_CLASS = `${HARBOR_BTN_GLASS_OUTLINE_LIGHT} min-w-[7rem] rounded-md px-4 py-2 text-xs`;

/** App hook for manage buttons (analytics / tests). */
export const HARBOR_BTN_PRIMARY_APP_CLASS = "app-index-manage-btn";

export const HARBOR_BTN_PRIMARY_DESKTOP_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_DESKTOP_CLASS}`;

export const HARBOR_BTN_PRIMARY_COMPACT_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_COMPACT_CLASS}`;

export const HARBOR_BTN_PRIMARY_RESPONSIVE_WITH_APP_CLASS = `${HARBOR_BTN_PRIMARY_APP_CLASS} ${HARBOR_BTN_PRIMARY_RESPONSIVE_CLASS}`;
