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

export const JOURNEY_FLOW_CLASS = "flex min-w-0 flex-col gap-0";

export const JOURNEY_REVENUE_BANNER_CLASS =
  `${JOURNEY_LIGHT_PANEL_CLASS} flex w-full flex-col gap-4 px-5 py-4 text-[#1E4775] lg:flex-row lg:items-stretch lg:gap-5 lg:px-6 lg:py-5`;

export const JOURNEY_REVENUE_BANNER_PRIMARY_CLASS =
  "flex min-w-0 flex-1 flex-col justify-center text-left";

export const JOURNEY_REVENUE_BANNER_SPLIT_PANEL_CLASS =
  "min-w-0 flex-1 rounded-xl bg-[#122a47] px-4 py-4 text-white sm:px-5 sm:py-5";

export const JOURNEY_REVENUE_SPLIT_DIAGRAM_CLASS =
  "flex h-full min-w-0 flex-col items-center justify-center";

export const JOURNEY_REVENUE_SPLIT_SOURCE_CLASS =
  "w-full max-w-[15rem] rounded-lg border border-white/15 bg-white/[0.08] px-4 py-3 text-center";

export const JOURNEY_REVENUE_SPLIT_SOURCE_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-white/45";

export const JOURNEY_REVENUE_SPLIT_SOURCE_TITLE_CLASS =
  "mt-1 text-base font-bold text-white sm:text-lg";

export const JOURNEY_REVENUE_SPLIT_CONNECTOR_CLASS =
  "mt-1 h-8 w-full max-w-[15rem] text-white";

export const JOURNEY_REVENUE_SPLIT_BRANCHES_CLASS =
  "grid w-full max-w-[18rem] grid-cols-2 gap-3 sm:gap-4";

export const JOURNEY_REVENUE_SPLIT_BRANCH_CLASS = "text-center";

export const JOURNEY_REVENUE_SPLIT_BRANCH_PCT_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl";

export const JOURNEY_REVENUE_SPLIT_BRANCH_LABEL_CLASS =
  "mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/45";

export const JOURNEY_REVENUE_SPLIT_BRANCH_DESC_CLASS =
  "mt-1 text-[11px] leading-snug text-white/60 sm:text-xs";

/** @deprecated Use JOURNEY_REVENUE_BANNER_SPLIT_PANEL_CLASS */
export const JOURNEY_REVENUE_BANNER_DIVIDER_CLASS =
  "hidden shrink-0 border-[#1E4775]/10 sm:block sm:w-px sm:self-stretch sm:border-l";

/** @deprecated Replaced by revenue split diagram */
export const JOURNEY_REVENUE_BANNER_BUYBACK_CLASS =
  "min-w-0 flex-1 sm:pl-6";

/** @deprecated Replaced by revenue split diagram */
export const JOURNEY_REVENUE_BANNER_BUYBACK_TITLE_CLASS =
  "text-sm font-semibold leading-tight text-[#1E4775] sm:text-base";

/** @deprecated Replaced by revenue split diagram */
export const JOURNEY_REVENUE_BANNER_BUYBACK_DESC_CLASS =
  "mt-1 text-xs leading-relaxed text-[#1E4775]/65";

export const JOURNEY_REVENUE_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-[#1E4775]/55";

export const JOURNEY_REVENUE_BANNER_VALUE_CLASS =
  "mt-0.5 font-mono text-2xl font-bold tabular-nums text-[#1E4775] sm:text-3xl";

export const JOURNEY_REVENUE_TAGLINE_CLASS =
  "mt-1 text-[11px] leading-snug text-[#1E4775]/55 sm:text-xs";

/** @deprecated Use JOURNEY_REVENUE_BANNER_CLASS */
export const JOURNEY_REVENUE_HERO_CLASS =
  `${JOURNEY_LIGHT_PANEL_CLASS} w-full shrink-0 px-4 py-3 text-left text-[#1E4775] sm:w-auto sm:min-w-[11rem] sm:max-w-[13.5rem]`;

/** @deprecated Use JOURNEY_REVENUE_BANNER_VALUE_CLASS */
export const JOURNEY_REVENUE_VALUE_CLASS = JOURNEY_REVENUE_BANNER_VALUE_CLASS;

export const JOURNEY_STAGE_GRID_CLASS =
  "m-0 mt-2 grid list-none grid-cols-1 gap-0 p-0 lg:mt-3 lg:grid-cols-3 lg:gap-4";

export const JOURNEY_STAGE_COLUMN_CLASS =
  "flex min-w-0 flex-col";

export const JOURNEY_DOWN_CHEVRON_SLOT_CLASS =
  "flex items-center justify-center py-2 lg:py-3";

export const JOURNEY_DOWN_CHEVRON_CLASS = "h-5 w-5 text-white/25";

export const JOURNEY_DOWN_CHEVRON_ACTIVE_CLASS = "h-5 w-5 text-harbor-coral";

export const JOURNEY_TIMELINE_ENTRY_CLASS =
  "text-center text-xs font-semibold uppercase tracking-wider text-white/45 lg:text-left";

export const JOURNEY_TIMELINE_CARD_SLOT_CLASS =
  "flex h-full min-h-0 w-full min-w-0 flex-1";

export const JOURNEY_STAGE_CARD_BASE =
  `relative flex h-full w-full min-w-0 flex-col p-4 text-[#1E4775] transition-[transform,box-shadow,opacity] duration-500 sm:p-5 ${JOURNEY_LIGHT_PANEL_CLASS}`;

export const JOURNEY_STAGE_CARD_ACTIVE =
  "z-[2] overflow-hidden border-[3px] border-harbor-coral bg-harbor-coral/[0.08] shadow-[0_0_0_4px_rgba(255,138,122,0.3),0_20px_56px_-16px_rgba(255,138,122,0.55)] ring-4 ring-harbor-coral/35";

export const JOURNEY_STAGE_CARD_COMPLETE = "";

export const JOURNEY_STAGE_CARD_FUTURE = "opacity-50";

export const JOURNEY_STAGE_ACTIVE_ACCENT_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-harbor-coral";

export const JOURNEY_STAGE_ACTIVE_BADGE_CLASS =
  "absolute left-3 top-3 z-[2]";

export const JOURNEY_STAGE_ICON_BADGE =
  `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-10 w-10 text-harbor-coral`;

export const JOURNEY_STAGE_ICON_PULSE =
  "absolute -inset-2 rounded-full bg-harbor-coral/30 animate-pulse motion-reduce:animate-none";

export const JOURNEY_STAGE_TITLE_CLASS =
  "text-sm font-semibold leading-tight text-balance text-[#1E4775] sm:text-base";

export const JOURNEY_STAGE_DESC_CLASS =
  "mt-1.5 text-xs leading-relaxed text-pretty text-[#1E4775]/65";

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
  "inline-flex items-center gap-1 rounded-full border border-[#2A7A5E]/25 bg-harbor-mint/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1A5C45]";

export const JOURNEY_STATUS_BADGE_ACTIVE =
  "inline-flex items-center gap-1 rounded-full bg-harbor-coral px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(255,138,122,0.8)]";

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

export const JOURNEY_EDUCATION_GRID_CLASS =
  "grid grid-cols-1 gap-6 border-t border-white/[0.08] pt-6 lg:grid-cols-2 lg:gap-8 lg:pt-8";

export const JOURNEY_EDUCATION_TITLE_CLASS = "text-sm font-semibold text-white";

export const JOURNEY_EDUCATION_BODY_CLASS =
  "mt-3 space-y-2 text-xs leading-relaxed text-white/55 sm:text-sm";
