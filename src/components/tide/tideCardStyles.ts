import {
  SAIL_ADVANCED_LIGHT_CAPTION,
  SAIL_ADVANCED_LIGHT_LABEL,
  SAIL_ADVANCED_LIGHT_VALUE,
  SAIL_EMBEDDED_FORM_PANEL,
} from "@/components/sail/advanced/sailAdvancedStyles";
import {
  HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE,
} from "@/components/shared/harborFrostedSurfaceStyles";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";

/** White frosted card shell — matches Sail embedded buy/sell panel. */
export const TIDE_FEATURE_CARD_SHELL = `flex min-h-[320px] flex-col lg:h-full ${SAIL_EMBEDDED_FORM_PANEL}`;

export const TIDE_FEATURE_CARD_TITLE =
  "text-sm font-bold leading-snug tracking-tight text-[#1E4775] sm:text-base";

/** Subtle inset rows inside Tide feature cards (Sail transaction overview style). */
export const TIDE_INSET_PANEL_SHELL =
  "rounded-md border border-[#1E4775]/10 bg-[#17395F]/5";

export const TIDE_INSET_LIGHT_LABEL_CLASS = SAIL_ADVANCED_LIGHT_LABEL;

export const TIDE_INSET_LIGHT_AMOUNT_SM_CLASS = `${SAIL_ADVANCED_LIGHT_VALUE} text-lg sm:text-xl`;

export const TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS = "text-sm text-[#1E4775]/55";

export const TIDE_INSET_LIGHT_META_CLASS = SAIL_ADVANCED_LIGHT_CAPTION;

/** Harbor theme accents on white frosted cards. */
export const TIDE_THEME = {
  coral: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-harbor-coral`,
    subtitle: "text-harbor-coral",
    badgeVariant: "coral" as StatusBadgeVariant,
    highlight: `${TIDE_INSET_PANEL_SHELL} ring-2 ring-[#FF8A7A]/25`,
    highlightText: "text-harbor-coral",
    inset: TIDE_INSET_PANEL_SHELL,
  },
  mint: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-[#4A9784]`,
    subtitle: "text-[#4A9784]",
    badgeVariant: "green" as StatusBadgeVariant,
    highlight: `${TIDE_INSET_PANEL_SHELL} ring-2 ring-[#4A9784]/25`,
    highlightText: "text-[#4A9784]",
    inset: TIDE_INSET_PANEL_SHELL,
  },
  blue: {
    iconBadge: `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-8 w-8 text-[#1E4775]`,
    subtitle: "text-[#1E4775]/70",
    badgeVariant: "neutral" as StatusBadgeVariant,
    highlight: `${TIDE_INSET_PANEL_SHELL} ring-2 ring-[#1E4775]/15`,
    highlightText: "text-[#1E4775]",
    inset: TIDE_INSET_PANEL_SHELL,
    maxButton: "text-[#4A9784]",
  },
} as const;

export const TIDE_META_TEXT = "text-xs leading-snug text-[#1E4775]/65";

export const TIDE_CAPTION_CLASS = "text-sm leading-relaxed text-[#1E4775]/60";

export const TIDE_CARD_FOOTER =
  "mt-auto border-t border-[#1E4775]/10 px-0 py-2.5 sm:py-3";

export const TIDE_CARD_BODY =
  "flex min-h-0 flex-1 flex-col pt-3 sm:pt-4 lg:justify-end";

export const TIDE_CARD_CONTENT_STACK = "flex w-full flex-col gap-4 sm:gap-5";

export const TIDE_DISCONNECTED_RING =
  "flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-[#1E4775]/20 bg-[#17395F]/5";

export const TIDE_AMOUNT_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-[#1E4775] sm:text-3xl";

export const TIDE_AMOUNT_SM_CLASS = TIDE_INSET_LIGHT_AMOUNT_SM_CLASS;

export const TIDE_INSET_LABEL_CLASS = TIDE_INSET_LIGHT_LABEL_CLASS;

/** Primary action — matches Sail embedded buy button. */
export const TIDE_PRIMARY_BUTTON_CLASS =
  "w-full rounded-lg py-3 px-4 text-sm font-semibold bg-[#4A9784] text-white transition hover:bg-[#3f8576] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500";

export const TIDE_INPUT_SHELL_CLASS = `${TIDE_INSET_PANEL_SHELL} flex items-center gap-2 px-3 py-2`;

export const TIDE_FOOTER_NOTE_CLASS = "text-[11px] leading-snug text-[#1E4775]/55";

export const TIDE_FOOTER_EXTRA_CORAL_CLASS =
  "text-[10px] font-medium leading-snug text-harbor-coral";

export const TIDE_FOOTER_EXTRA_MINT_CLASS =
  "text-[10px] font-medium leading-snug text-[#4A9784]";

export const TIDE_FOOTER_EXTRA_BLUE_CLASS =
  "font-mono text-[10px] tabular-nums leading-snug text-[#1E4775]/65";
