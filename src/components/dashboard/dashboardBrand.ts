/**
 * Dashboard brand and emphasis tokens — Phase 3 identity polish.
 * Dashboard-only; does not modify shared Maiden Voyage globals.
 */

/** Harbor gold — Revenue Share flagship accent (matches `harbor-gold` in tailwind.config.js) */
export const DASHBOARD_BRAND_GOLD = "#F5D76E";

/** Featured Revenue Share card — richer but restrained */
export const DASHBOARD_REVENUE_SHARE_CARD_CLASS =
  "relative overflow-hidden bg-gradient-to-br from-harbor-gold/[0.11] via-harbor-glass/20 to-transparent";

export const DASHBOARD_REVENUE_SHARE_CARD_INNER_GLOW =
  "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-harbor-gold/[0.06] before:to-transparent";

/** Hero card top edge highlight */
export const DASHBOARD_HERO_BRAND_EDGE_CLASS =
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-harbor-gold/30 before:to-transparent";

/** Hero chip tiers */
export const DASHBOARD_HERO_CHIP_PRIMARY_SHELL_EXTRA =
  "ring-1 ring-harbor-gold/20 bg-harbor-glass/36";

export const DASHBOARD_HERO_CHIP_SECONDARY_OPACITY = "opacity-90";

/** Allocation bar segments — gradient fills */
export const ALLOCATION_BAR_EARN = "bg-gradient-to-r from-harbor-mint to-harbor-mint/70";

export const ALLOCATION_BAR_SAIL = "bg-gradient-to-r from-harbor-purple to-harbor-purple/70";

export const ALLOCATION_BAR_ARCHIVED = "bg-gradient-to-r from-white/50 to-white/30";

export const ALLOCATION_LEGEND_DOT_EARN = "bg-harbor-mint";

export const ALLOCATION_LEGEND_DOT_SAIL = "bg-harbor-purple";

export const ALLOCATION_LEGEND_DOT_ARCHIVED = "bg-white/50";

/** Yield row highlight when pending distribution > 0 (dark inset rows) */
export const DASHBOARD_YIELD_ROW_PENDING_CLASS =
  "border-l-2 border-l-harbor-coral/35 bg-white/[0.02]";

/** Accordion premium easing */
export const DASHBOARD_ACCORDION_TRANSITION =
  "grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";

export const DASHBOARD_ACCORDION_CONTENT_CLASS =
  "transition-opacity duration-300 ease-out motion-reduce:transition-none";

export const DASHBOARD_CHEVRON_TRANSITION =
  "duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";

/** Open accordion header treatment */
export const DASHBOARD_SECTION_HEADER_OPEN_CLASS =
  "bg-white/[0.04] border-b border-white/[0.08]";

export const DASHBOARD_SECTION_HEADER_OPEN_FEATURED_CLASS =
  "ring-1 ring-inset ring-harbor-gold/15";

export const DASHBOARD_CHEVRON_OPEN_CLASS = "text-white/75";

export const DASHBOARD_CHEVRON_CLOSED_CLASS = "text-white/40";

/** Revenue share empty state accent */
export const DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS =
  "border-l-2 border-l-harbor-gold/40";
