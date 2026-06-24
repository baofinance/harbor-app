import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { DASHBOARD_ACTIVITY_INSET_CLASS } from "../dashboardDensity";

export const ENGAGEMENT_CARD_CLASS = `${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3.5 sm:px-5 sm:py-4`;

/** Lighter inset used inside the activity module (no nested full card shell). */
export const DASHBOARD_ACTIVITY_INSET_PANEL_CLASS = DASHBOARD_ACTIVITY_INSET_CLASS;

export const DASHBOARD_INTELLIGENCE_CARD_CLASS = ENGAGEMENT_CARD_CLASS;

export const ENGAGEMENT_SECTION_TITLE_CLASS = "text-sm font-semibold text-white/95";

export const ENGAGEMENT_LABEL_CLASS = MV_SECTION_LABEL;

export const ENGAGEMENT_VALUE_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white/95 sm:text-base";

export const ENGAGEMENT_MUTED_CLASS = "text-xs text-white/50";

export const ENGAGEMENT_ACCENT_GOLD = "border-l-[3px] border-l-harbor-gold";
export const ENGAGEMENT_ACCENT_CORAL = "border-l-[3px] border-l-harbor-coral";
export const ENGAGEMENT_ACCENT_MINT = "border-l-[3px] border-l-harbor-mint";
