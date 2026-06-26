import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_CAPTION_TEXT,
  MV_FOOTER_PANEL,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
  MV_STAT_TILE,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { TIDE_META_TEXT } from "@/components/tide/tideCardStyles";

export const TIDE_FLYWHEEL_SECTION_CLASS = `mt-8 flex min-w-0 flex-col overflow-hidden ${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT}`;

export const TIDE_FLYWHEEL_CONTENT_CLASS = "min-w-0 p-3 sm:p-4 lg:p-5";

export const TIDE_FLYWHEEL_CARD_BASE = `${MV_STAT_TILE} flex min-w-[220px] max-w-[280px] shrink-0 snap-center flex-col p-3 sm:min-w-[240px] sm:p-4 lg:min-h-0 lg:min-w-0 lg:max-w-none lg:w-full lg:shrink`;

export const TIDE_FLYWHEEL_CARD_ACTIVE =
  "ring-1 ring-[#4A9784]/50 shadow-[0_0_24px_-8px_rgba(74,151,132,0.55)]";

export const TIDE_FLYWHEEL_CARD_INACTIVE = "ring-1 ring-white/[0.06]";

export const TIDE_FLYWHEEL_ICON_BADGE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#122a47]/80 text-[#B8EBD5]";

export const TIDE_FLYWHEEL_CARD_TITLE =
  "text-sm font-semibold leading-tight text-white";

export const TIDE_FLYWHEEL_CARD_DESC =
  "mt-1.5 text-[11px] leading-snug text-white/55 sm:text-xs";

export const TIDE_FLYWHEEL_STAT_LABEL = `${MV_SECTION_LABEL} text-[10px] text-center`;

export const TIDE_FLYWHEEL_STAT_VALUE =
  "font-mono text-lg font-bold tabular-nums text-white sm:text-xl text-center";

export const TIDE_FLYWHEEL_STAT_SUB =
  "font-mono text-xs tabular-nums text-white/60 text-center";

export const TIDE_FLYWHEEL_ARROW =
  "hidden shrink-0 self-center text-white/25 lg:block lg:px-0.5";

/** Mobile: horizontal scroll. lg+: equal-width grid so cards stay inside the shell. */
export const TIDE_FLYWHEEL_SCROLL_ROW =
  "min-w-0 flex overflow-x-auto pb-1 snap-x snap-mandatory lg:block lg:w-full lg:overflow-hidden lg:pb-0";

export const TIDE_FLYWHEEL_DESKTOP_ROW =
  "flex w-max min-w-full items-stretch gap-2 lg:grid lg:w-full lg:min-w-0 lg:max-w-full lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-0.5";

export const TIDE_FLYWHEEL_REVENUE_PILL = `${MV_STAT_TILE} inline-flex flex-col items-center self-center px-3 py-2 text-center sm:self-auto sm:px-4`;

export const TIDE_FLYWHEEL_TARGET_BADGE =
  "absolute right-0 top-1/2 max-w-[calc(100%-0.5rem)] -translate-y-1/2 truncate rounded-md bg-[#4A9784] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0B2A2F]";

export const TIDE_FLYWHEEL_INACTIVE_BADGE =
  "rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45";

export {
  MV_PROGRESS_TRACK as TIDE_FLYWHEEL_PROGRESS_TRACK,
  MV_PROGRESS_FILL as TIDE_FLYWHEEL_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE as TIDE_FLYWHEEL_PROGRESS_FILL_COMPLETE,
  MV_FOOTER_PANEL as TIDE_FLYWHEEL_FOOTER_PANEL,
  MV_CAPTION_TEXT as TIDE_FLYWHEEL_CAPTION,
  TIDE_META_TEXT as TIDE_FLYWHEEL_META,
};
