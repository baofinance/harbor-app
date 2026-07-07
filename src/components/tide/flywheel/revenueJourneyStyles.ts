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
  `${JOURNEY_LIGHT_PANEL_CLASS} w-full px-5 py-5 text-[#1E4775] sm:px-6 sm:py-6`;

/** Flow: revenue source feeds right into Reinvest and down into Strengthen TIDE. */
export const JOURNEY_SPLIT_DIAGRAM_CLASS = "flex flex-col";

/** Top row — revenue source (left) feeding into the Reinvest branch (right). */
export const JOURNEY_SPLIT_TOP_ROW_CLASS =
  "flex flex-col lg:flex-row lg:items-stretch";

/** Left column: revenue source box only (connectors live in separate rows). */
export const JOURNEY_REVENUE_COLUMN_CLASS = "w-full shrink-0 lg:w-[15rem]";

export const JOURNEY_REVENUE_SOURCE_BOX_CLASS =
  "flex h-full flex-col items-center justify-center rounded-xl border border-[#1E4775]/15 bg-[#1E4775]/[0.05] px-4 py-4 text-center";

/** Horizontal connector between revenue and Reinvest (desktop): line + arrowhead. */
export const JOURNEY_SPLIT_RIGHT_CONNECTOR_CLASS =
  "hidden shrink-0 items-center lg:flex lg:w-12";

export const JOURNEY_SPLIT_RIGHT_LINE_CLASS =
  "h-[3px] flex-1 rounded-full bg-[#1E4775]/45";

export const JOURNEY_SPLIT_RIGHT_CHEVRON_CLASS =
  "-ml-1.5 h-5 w-5 shrink-0 text-[#1E4775]/55";

/** Vertical connector under the revenue box, into Strengthen TIDE (desktop). */
export const JOURNEY_SPLIT_DOWN_CONNECTOR_CLASS =
  "hidden lg:flex lg:w-[15rem] lg:shrink-0 lg:flex-col lg:items-center";

export const JOURNEY_SPLIT_DOWN_LINE_CLASS =
  "h-6 w-[3px] rounded-full bg-harbor-coral/60";

export const JOURNEY_SPLIT_DOWN_CHEVRON_ICON_CLASS =
  "-mt-1.5 h-5 w-5 text-harbor-coral";

/** Down connector shown on mobile between stacked boxes: line + chevron. */
export const JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS =
  "flex flex-col items-center py-1 lg:hidden";

export const JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_CLASS =
  "h-5 w-[3px] rounded-full bg-[#1E4775]/35";

export const JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_TIDE_CLASS =
  "h-5 w-[3px] rounded-full bg-harbor-coral/55";

export const JOURNEY_SPLIT_CONNECTOR_MOBILE_CHEVRON_CLASS = "-mt-1.5 h-5 w-5";

/** Bottom row holding the Strengthen TIDE box (full width). */
export const JOURNEY_SPLIT_BOTTOM_ROW_CLASS = "";

/** Header row inside the Strengthen TIDE box (percentage + label/description). */
export const JOURNEY_TIDE_HEADER_CLASS = "flex items-start gap-4";

/** Grid holding the Treasury / POL / Burn stage cards inside the Strengthen TIDE box. */
export const JOURNEY_TIDE_STAGE_GRID_CLASS =
  "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3";

/** Mini market boxes inside the Reinvest branch (consistent with stage chips). */
export const JOURNEY_MARKET_GRID_CLASS = "mt-2 flex flex-wrap gap-1.5";

export const JOURNEY_MARKET_BOX_BASE_CLASS =
  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold";

export const JOURNEY_MARKET_BOX_ACTIVE_CLASS =
  `${JOURNEY_MARKET_BOX_BASE_CLASS} border-[#1E4775]/20 bg-white/70 text-[#1E4775]`;

export const JOURNEY_MARKET_BOX_LOADING_CLASS =
  `${JOURNEY_MARKET_BOX_BASE_CLASS} animate-pulse border-dashed border-[#1E4775]/40 bg-white/40 text-[#1E4775]/70`;

export const JOURNEY_MARKET_BOX_INACTIVE_CLASS =
  `${JOURNEY_MARKET_BOX_BASE_CLASS} border-[#1E4775]/10 bg-[#1E4775]/[0.03] text-[#1E4775]/40`;

export const JOURNEY_SPLIT_BRANCHES_CLASS =
  "flex min-w-0 flex-1 flex-col justify-center gap-3";

export const JOURNEY_SPLIT_BRANCH_BASE_CLASS =
  "flex items-center gap-4 rounded-xl border px-4 py-3";

export const JOURNEY_SPLIT_CHIPS_ROW_CLASS =
  "mt-2 flex flex-wrap items-center gap-1.5";

export const JOURNEY_SPLIT_CHIPS_LABEL_CLASS =
  "mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

export const JOURNEY_SPLIT_CHIP_ACTIVE_CLASS =
  "inline-flex items-center rounded-md border border-[#1E4775]/20 bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#1E4775]";

export const JOURNEY_SPLIT_CHIP_INACTIVE_CLASS =
  "inline-flex items-center rounded-md border border-[#1E4775]/10 bg-[#1E4775]/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#1E4775]/40";

export const JOURNEY_SPLIT_CHIP_LOADING_CLASS =
  "inline-flex animate-pulse items-center gap-1 rounded-md border border-dashed border-[#1E4775]/40 bg-white/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#1E4775]/70";

export const JOURNEY_SPLIT_CHIP_TIDE_CLASS =
  "inline-flex items-center rounded-md border border-harbor-coral/30 bg-harbor-coral/10 px-1.5 py-0.5 text-[10px] font-semibold text-harbor-coral";

/** TIDE destination chips rendered inside the Strengthen TIDE box (light panel). */
export const JOURNEY_TIDE_DEST_CHIP_BASE_CLASS =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

export const JOURNEY_TIDE_DEST_CHIP_ACTIVE_CLASS =
  `${JOURNEY_TIDE_DEST_CHIP_BASE_CLASS} border-harbor-coral bg-harbor-coral text-white shadow-[0_4px_14px_-6px_rgba(255,138,122,0.7)]`;

export const JOURNEY_TIDE_DEST_CHIP_COMPLETE_CLASS =
  `${JOURNEY_TIDE_DEST_CHIP_BASE_CLASS} border-[#2A7A5E]/25 bg-harbor-mint/35 text-[#1A5C45]`;

export const JOURNEY_TIDE_DEST_CHIP_FUTURE_CLASS =
  `${JOURNEY_TIDE_DEST_CHIP_BASE_CLASS} border-[#1E4775]/15 bg-[#1E4775]/[0.04] text-[#1E4775]/40`;

export const JOURNEY_SPLIT_BRANCH_REINVEST_CLASS =
  `${JOURNEY_SPLIT_BRANCH_BASE_CLASS} flex-1 border-[#1E4775]/15 bg-[#1E4775]/[0.04]`;

export const JOURNEY_SPLIT_BRANCH_TIDE_CLASS =
  "rounded-xl border border-harbor-coral/40 bg-harbor-coral/[0.08] px-4 py-4 sm:px-5 sm:py-5";

export const JOURNEY_SPLIT_BRANCH_PCT_REINVEST_CLASS =
  "shrink-0 font-mono text-2xl font-bold tabular-nums text-[#1E4775] sm:text-3xl";

export const JOURNEY_SPLIT_BRANCH_PCT_TIDE_CLASS =
  "shrink-0 font-mono text-2xl font-bold tabular-nums text-harbor-coral sm:text-3xl";

export const JOURNEY_SPLIT_BRANCH_BODY_CLASS = "min-w-0 flex-1";

export const JOURNEY_SPLIT_BRANCH_LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[#1E4775]";

export const JOURNEY_SPLIT_BRANCH_DESC_CLASS =
  "mt-0.5 text-[11px] leading-snug text-[#1E4775]/60 sm:text-xs";

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
  "m-0 mt-0 grid list-none grid-cols-1 gap-0 p-0 lg:grid-cols-3 lg:gap-4";

export const JOURNEY_STAGE_COLUMN_CLASS =
  "flex min-w-0 flex-col";

export const JOURNEY_DESTINATION_FEED_CLASS =
  "flex flex-col items-center py-1 lg:py-1.5";

export const JOURNEY_DESTINATION_FEED_LINE_CLASS = "h-3 w-px bg-white/20";

export const JOURNEY_DESTINATION_FEED_LINE_ACTIVE_CLASS =
  "h-3 w-px bg-harbor-coral/70";

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
