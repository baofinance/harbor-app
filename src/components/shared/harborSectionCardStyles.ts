import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE } from "@/components/shared/harborFrostedSurfaceStyles";

export const HARBOR_SECTION_CARD_SHELL_CLASS = `${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden relative`;

export const HARBOR_SECTION_CARD_ACCENT_BAR_CLASS =
  "absolute inset-y-0 left-0 w-[3px]";

export const HARBOR_SECTION_CARD_HEADER_CLASS = "flex flex-col gap-0 px-3 sm:px-4";

export const HARBOR_SECTION_CARD_HEADER_ROW_CLASS =
  "flex min-h-[2.75rem] w-full items-center gap-2.5";

export const HARBOR_SECTION_CARD_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-normal text-harbor-blue/75";

export const HARBOR_SECTION_CARD_ICON_BADGE_BASE =
  `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE}`;

export const HARBOR_SECTION_CARD_BODY_CLASS = "px-3 pb-2.5 pt-0 sm:px-4 sm:pb-3";

export const HARBOR_SECTION_ICON_EARN_CLASS = `${HARBOR_SECTION_CARD_ICON_BADGE_BASE} border-harbor-mint/25 bg-harbor-mint/8 text-harbor-mint`;

export const HARBOR_SECTION_ICON_SAIL_CLASS = `${HARBOR_SECTION_CARD_ICON_BADGE_BASE} border-harbor-coral/25 bg-harbor-coral/8 text-harbor-coral`;

export const HARBOR_SECTION_ICON_MV_CLASS = `${HARBOR_SECTION_CARD_ICON_BADGE_BASE} border-harbor-coral/25 text-harbor-coral`;

export const HARBOR_SECTION_ICON_NEUTRAL_CLASS = `${HARBOR_SECTION_CARD_ICON_BADGE_BASE} border-harbor-blue/25 bg-harbor-blue/8 text-harbor-blue`;

export const HARBOR_SECTION_ACCENT_EARN_CLASS = "bg-harbor-mint";
export const HARBOR_SECTION_ACCENT_SAIL_CLASS = "bg-harbor-coral";
export const HARBOR_SECTION_ACCENT_MV_CLASS = "bg-harbor-coral";
export const HARBOR_SECTION_ACCENT_NEUTRAL_CLASS = "bg-harbor-blue";
