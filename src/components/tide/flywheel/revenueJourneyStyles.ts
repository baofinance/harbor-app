import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE } from "@/components/shared/harborFrostedSurfaceStyles";

export const JOURNEY_SECTION_CLASS = `mt-8 flex min-w-0 flex-col overflow-hidden ${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT}`;

export const JOURNEY_CONTENT_CLASS = "min-w-0 space-y-8 p-5 sm:p-6 lg:p-8";

export const JOURNEY_TITLE_CLASS =
  "text-2xl font-bold tracking-tight text-white sm:text-3xl";

export const JOURNEY_SUBTITLE_CLASS =
  "mt-2 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base";

export const JOURNEY_REVENUE_HERO_CLASS =
  "rounded-2xl border border-white/[0.08] bg-[#122a47]/50 px-5 py-6 text-center shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-8 sm:py-8";

export const JOURNEY_REVENUE_LABEL_CLASS = MV_SECTION_LABEL;

export const JOURNEY_REVENUE_VALUE_CLASS =
  "mt-2 font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl lg:text-[2.75rem]";

export const JOURNEY_REVENUE_TAGLINE_CLASS = "mt-2 text-sm text-white/55";

export const JOURNEY_TIMELINE_ENTRY_CLASS =
  "text-center text-xs font-semibold uppercase tracking-wider text-white/45 lg:text-left";

export const JOURNEY_TIMELINE_LIST_CLASS =
  "flex flex-col gap-0 lg:flex-row lg:items-stretch lg:gap-0";

export const JOURNEY_TIMELINE_ITEM_CLASS =
  "flex flex-col lg:min-w-0 lg:flex-1 lg:flex-row lg:items-stretch";

export const JOURNEY_STAGE_CARD_BASE =
  "relative flex min-w-0 flex-1 flex-col rounded-2xl bg-white/[0.11] p-4 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[transform,box-shadow,opacity] duration-500 sm:p-5";

export const JOURNEY_STAGE_CARD_ACTIVE =
  "z-[1] scale-[1.02] shadow-[0_12px_40px_-10px_rgba(255,138,122,0.35)] ring-1 ring-harbor-coral/40";

export const JOURNEY_STAGE_CARD_COMPLETE = "";

export const JOURNEY_STAGE_CARD_FUTURE = "opacity-50";

export const JOURNEY_STAGE_ICON_BADGE =
  `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-10 w-10 text-harbor-coral`;

export const JOURNEY_STAGE_ICON_PULSE =
  "absolute -inset-1 rounded-full bg-harbor-coral/20 animate-pulse motion-reduce:animate-none";

export const JOURNEY_STAGE_TITLE_CLASS =
  "text-sm font-semibold leading-tight text-[#1E4775] sm:text-base";

export const JOURNEY_STAGE_DESC_CLASS =
  "mt-1.5 text-xs leading-snug text-[#1E4775]/65";

export const JOURNEY_STAGE_STAT_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/55";

export const JOURNEY_STAGE_STAT_VALUE_CLASS =
  "font-mono text-lg font-bold tabular-nums text-[#1E4775] sm:text-xl";

export const JOURNEY_STAGE_STAT_SUB_CLASS =
  "font-mono text-xs tabular-nums text-[#1E4775]/60";

export const JOURNEY_STATUS_BADGE_COMPLETE =
  "inline-flex items-center gap-1 rounded-full bg-harbor-mint/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-harbor-mint";

export const JOURNEY_STATUS_BADGE_ACTIVE =
  "inline-flex items-center gap-1 rounded-full bg-harbor-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-harbor-coral";

export const JOURNEY_STATUS_BADGE_UPCOMING =
  "inline-flex items-center rounded-full border border-[#1E4775]/15 bg-[#1E4775]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export const JOURNEY_CHECKMARK_CLASS =
  "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-harbor-mint text-white";

export const JOURNEY_PROGRESS_TRACK =
  "h-2 overflow-hidden rounded-full bg-[#1E4775]/10";

export const JOURNEY_PROGRESS_FILL = `${MV_PROGRESS_FILL} transition-[width] duration-700 ease-out motion-reduce:transition-none`;

export const JOURNEY_PROGRESS_FILL_COMPLETE = `${MV_PROGRESS_FILL_COMPLETE} transition-[width] duration-700 ease-out motion-reduce:transition-none`;

export const JOURNEY_CONNECTOR_VERTICAL_CLASS =
  "flex flex-col items-center py-2 lg:hidden";

export const JOURNEY_CONNECTOR_HORIZONTAL_CLASS =
  "hidden shrink-0 items-center px-1 lg:flex";

export const JOURNEY_CONNECTOR_LINE_CLASS = "bg-white/10";

export const JOURNEY_CONNECTOR_CHEVRON_CLASS = "text-white/30";

export const JOURNEY_CONNECTOR_CHEVRON_ACTIVE_CLASS = "text-harbor-coral/60";

export const JOURNEY_ALLOCATION_CARD_CLASS =
  "rounded-2xl border border-white/[0.08] bg-[#0a1929]/40 px-4 py-5 backdrop-blur-md sm:px-6";

export const JOURNEY_ALLOCATION_TITLE_CLASS =
  "text-sm font-semibold text-white/90";

export const JOURNEY_ALLOCATION_BAR_TRACK =
  "mt-4 h-3 overflow-hidden rounded-full bg-white/[0.08]";

export const JOURNEY_ALLOCATION_BAR_FILL =
  "h-full rounded-full bg-gradient-to-r from-harbor-coral/80 to-harbor-coral transition-[width] duration-700 ease-out motion-reduce:transition-none";

export const JOURNEY_ALLOCATION_LABEL_CLASS = "text-xs text-white/70";

export const JOURNEY_ALLOCATION_VALUE_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-white";

export const JOURNEY_EDUCATION_GRID_CLASS =
  "grid grid-cols-1 gap-6 border-t border-white/[0.08] pt-6 lg:grid-cols-2 lg:gap-8 lg:pt-8";

export const JOURNEY_EDUCATION_TITLE_CLASS = "text-sm font-semibold text-white";

export const JOURNEY_EDUCATION_BODY_CLASS =
  "mt-3 space-y-2 text-xs leading-relaxed text-white/55 sm:text-sm";
