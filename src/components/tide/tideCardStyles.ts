import {
  SAIL_ADVANCED_LIGHT_CAPTION,
  SAIL_ADVANCED_LIGHT_VALUE,
  SAIL_EMBEDDED_FORM_PANEL,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { MV_GLASS_INSET_DARK } from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE,
} from "@/components/shared/harborFrostedSurfaceStyles";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";

/** Dark frosted glass inset — Tide airdrop card, flywheel revenue pill. */
export const TIDE_DARK_GLASS_SHELL = `rounded-xl ${MV_GLASS_INSET_DARK}`;

/** White frosted card shell — matches Sail embedded buy/sell panel. */
export const TIDE_FEATURE_CARD_SHELL = `flex min-h-[320px] flex-col lg:h-full ${SAIL_EMBEDDED_FORM_PANEL}`;

/** Dark frosted feature card — airdrop snapshot panel. */
export const TIDE_DARK_FEATURE_CARD_SHELL = `flex min-h-[320px] flex-col lg:h-full ${TIDE_DARK_GLASS_SHELL} p-3 sm:p-4`;

export const TIDE_FEATURE_CARD_TITLE =
  "text-sm font-bold leading-snug tracking-tight text-[#1E4775] sm:text-base";

export const TIDE_DARK_FEATURE_CARD_TITLE =
  "text-sm font-bold leading-snug tracking-tight text-white/95 sm:text-base";

/** Form field labels — matches Sail `AmountInputBlock`. */
export const TIDE_FIELD_LABEL_CLASS = "text-sm font-semibold text-[#1E4775]";

export const TIDE_DARK_FIELD_LABEL_CLASS = "text-sm font-semibold text-white/80";

/** Bordered amount input — matches Sail buy/sell (same fill as panel, not brighter white). */
export const TIDE_INPUT_FIELD_CLASS =
  "w-full rounded-md px-3 py-2 bg-transparent text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono placeholder:text-[#1E4775]/25";

export const TIDE_INPUT_FIELD_WITH_MAX_CLASS = `${TIDE_INPUT_FIELD_CLASS} pr-20`;

export const TIDE_MAX_BUTTON_CLASS =
  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 font-medium";

/** Summary / receive rows — Sail transaction overview style. */
export const TIDE_OVERVIEW_PANEL_SHELL =
  "rounded-md border border-[#1E4775]/10 bg-[#17395F]/5 px-3 py-2.5";

export const TIDE_ROW_DIVIDER =
  "flex w-full items-center justify-between gap-3 border-b border-[#1E4775]/10 py-2.5 last:border-b-0";

export const TIDE_DARK_ROW_DIVIDER =
  "flex w-full items-center justify-between gap-3 border-b border-white/[0.08] py-2.5 last:border-b-0";

export const TIDE_INSET_LIGHT_LABEL_CLASS = "text-xs font-medium text-[#1E4775]/65";

export const TIDE_DARK_INSET_LABEL_CLASS = "text-xs font-medium text-white/60";

export const TIDE_INSET_LIGHT_AMOUNT_SM_CLASS = `${SAIL_ADVANCED_LIGHT_VALUE} text-lg sm:text-xl`;

export const TIDE_DARK_INSET_AMOUNT_SM_CLASS =
  "font-mono text-lg font-semibold tabular-nums text-white/90 sm:text-xl";

export const TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS = "text-sm text-[#1E4775]/55";

export const TIDE_DARK_INSET_AMOUNT_UNIT_CLASS = "text-sm text-white/50";

export const TIDE_INSET_LIGHT_META_CLASS = SAIL_ADVANCED_LIGHT_CAPTION;

/** Harbor theme accents on white frosted cards. */
export const TIDE_THEME = {
  coral: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-harbor-coral`,
    darkIconBadge:
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-harbor-coral",
    subtitle: "text-harbor-coral",
    badgeVariant: "coral" as StatusBadgeVariant,
  },
  mint: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-[#4A9784]`,
    subtitle: "text-[#4A9784]",
    badgeVariant: "green" as StatusBadgeVariant,
  },
  blue: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-[#1E4775]`,
    subtitle: "text-[#1E4775]/70",
    badgeVariant: "neutral" as StatusBadgeVariant,
  },
} as const;

export const TIDE_META_TEXT = "text-xs leading-snug text-[#1E4775]/65";

export const TIDE_DARK_META_TEXT = "text-xs leading-snug text-white/55";

export const TIDE_CAPTION_CLASS = "text-sm leading-relaxed text-[#1E4775]/60";

export const TIDE_CARD_FOOTER =
  "mt-auto border-t border-[#1E4775]/10 px-0 py-2.5 sm:py-3";

export const TIDE_DARK_CARD_FOOTER =
  "mt-auto border-t border-white/[0.08] px-0 py-2.5 sm:py-3";

export const TIDE_CARD_BODY =
  "flex min-h-0 flex-1 flex-col pt-3 sm:pt-4 lg:justify-end";

export const TIDE_CARD_CONTENT_STACK = "flex w-full flex-col gap-4";

export const TIDE_AMOUNT_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-[#1E4775] sm:text-3xl";

export const TIDE_DARK_AMOUNT_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl";

/** Primary action — matches Sail embedded buy button. */
export const TIDE_PRIMARY_BUTTON_CLASS =
  "w-full rounded-lg py-3 px-4 text-sm font-semibold bg-[#4A9784] text-white transition hover:bg-[#3f8576] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500";

export const TIDE_FOOTER_NOTE_CLASS = "text-[11px] leading-snug text-[#1E4775]/55";

export const TIDE_DARK_FOOTER_NOTE_CLASS = "text-[11px] leading-snug text-white/50";

export const TIDE_FOOTER_EXTRA_CORAL_CLASS =
  "text-[10px] font-medium leading-snug text-harbor-coral";

export const TIDE_FOOTER_EXTRA_MINT_CLASS =
  "text-[10px] font-medium leading-snug text-[#4A9784]";

export const TIDE_FOOTER_EXTRA_BLUE_CLASS =
  "font-mono text-[10px] tabular-nums leading-snug text-[#1E4775]/65";
