import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_LIGHT_CARD_ELEVATED,
  HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE,
} from "@/components/shared/harborFrostedSurfaceStyles";
import {
  TIDE_FEATURE_CARD_TITLE,
  TIDE_INSET_LIGHT_LABEL_CLASS,
} from "@/components/tide/tideCardStyles";

/** Light frosted panel — matches Claim / Swap cards on the TIDE page. */
export const JOURNEY_LIGHT_PANEL_CLASS = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

export const JOURNEY_SECTION_CLASS = `mt-8 flex min-w-0 flex-col overflow-hidden ${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT}`;

export const JOURNEY_CONTENT_CLASS = "min-w-0 space-y-8 p-5 sm:p-6 lg:p-8";

export const JOURNEY_HEADER_ROW_CLASS =
  "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 lg:gap-6";

export const JOURNEY_HEADER_TEXT_CLASS = "min-w-0 flex-1";

export const JOURNEY_TITLE_CLASS =
  "text-2xl font-bold tracking-tight text-white sm:text-3xl";

export const JOURNEY_SUBTITLE_CLASS =
  "mt-2 text-sm leading-relaxed text-white/65 sm:text-base";

export const JOURNEY_REVENUE_HERO_CLASS =
  `${JOURNEY_LIGHT_PANEL_CLASS} w-full shrink-0 px-4 py-3 text-left text-[#1E4775] sm:w-auto sm:min-w-[11rem] sm:max-w-[13.5rem]`;

export const JOURNEY_REVENUE_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-[#1E4775]/55";

export const JOURNEY_REVENUE_VALUE_CLASS =
  "mt-0.5 font-mono text-xl font-bold tabular-nums text-[#1E4775] sm:text-2xl";

export const JOURNEY_REVENUE_TAGLINE_CLASS =
  "mt-1 text-[11px] leading-snug text-[#1E4775]/55 sm:text-xs";

export const JOURNEY_TIMELINE_ENTRY_CLASS =
  "text-center text-xs font-semibold uppercase tracking-wider text-white/45 lg:text-left";

export const JOURNEY_TIMELINE_LIST_CLASS =
  "flex flex-col gap-0 lg:flex-row lg:items-stretch lg:gap-0";

export const JOURNEY_TIMELINE_ITEM_CLASS =
  "flex flex-col lg:min-w-0 lg:flex-1 lg:flex-row lg:items-stretch";

export const JOURNEY_TIMELINE_CARD_SLOT_CLASS =
  "flex min-h-0 min-w-0 flex-1 lg:h-full";

export const JOURNEY_STAGE_CARD_BASE =
  `relative flex h-full w-full min-w-0 flex-col p-4 text-[#1E4775] transition-[transform,box-shadow,opacity] duration-500 sm:p-5 ${JOURNEY_LIGHT_PANEL_CLASS}`;

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
  "mt-1.5 min-h-[2.5rem] text-xs leading-snug text-[#1E4775]/65 line-clamp-2";

export const JOURNEY_STAGE_STAT_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/55";

export const JOURNEY_STAGE_STAT_VALUE_CLASS =
  "font-mono text-lg font-bold tabular-nums text-[#1E4775] sm:text-xl";

export const JOURNEY_STAGE_STAT_SUB_CLASS =
  "font-mono text-xs tabular-nums text-[#1E4775]/60";

export const JOURNEY_STAGE_METRICS_SLOT_CLASS =
  "mt-4 flex min-h-[4.5rem] w-full flex-col items-center justify-start text-center";

export const JOURNEY_STAGE_PROGRESS_SLOT_CLASS =
  "mt-4 flex min-h-8 w-full items-center";

export const JOURNEY_STAGE_FOOTER_SLOT_CLASS =
  "mt-auto flex w-full flex-col items-center pt-3 text-center";

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
  "hidden shrink-0 items-center self-center px-1 lg:flex";

export const JOURNEY_CONNECTOR_LINE_CLASS = "bg-white/10";

export const JOURNEY_CONNECTOR_CHEVRON_CLASS = "text-white/30";

export const JOURNEY_CONNECTOR_CHEVRON_ACTIVE_CLASS = "text-harbor-coral/60";

export const JOURNEY_ALLOCATION_CARD_CLASS =
  `${JOURNEY_LIGHT_PANEL_CLASS} px-4 py-5 text-[#1E4775] sm:px-6`;

export const JOURNEY_ALLOCATION_TITLE_CLASS = TIDE_FEATURE_CARD_TITLE;

export const JOURNEY_ALLOCATION_BAR_TRACK =
  "mt-4 h-3 overflow-hidden rounded-full bg-[#1E4775]/10";

export const JOURNEY_ALLOCATION_BAR_FILL =
  "h-full rounded-full bg-gradient-to-r from-harbor-coral/80 to-harbor-coral transition-[width] duration-700 ease-out motion-reduce:transition-none";

export const JOURNEY_ALLOCATION_LABEL_CLASS = TIDE_INSET_LIGHT_LABEL_CLASS;

export const JOURNEY_ALLOCATION_VALUE_CLASS =
  "font-mono text-sm font-semibold tabular-nums text-[#1E4775]";

export const JOURNEY_EDUCATION_GRID_CLASS =
  "grid grid-cols-1 gap-6 border-t border-white/[0.08] pt-6 lg:grid-cols-2 lg:gap-8 lg:pt-8";

export const JOURNEY_EDUCATION_TITLE_CLASS = "text-sm font-semibold text-white";

export const JOURNEY_EDUCATION_BODY_CLASS =
  "mt-3 space-y-2 text-xs leading-relaxed text-white/55 sm:text-sm";
