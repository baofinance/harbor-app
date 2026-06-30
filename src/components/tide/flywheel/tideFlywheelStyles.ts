import {
  MV_ACCENT_GRADIENT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_FOOTER_PANEL,
  MV_GLASS_INSET_DARK,
  MV_HEADLINE,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { HARBOR_FROSTED_LIGHT_CARD_ELEVATED, HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE } from "@/components/shared/harborFrostedSurfaceStyles";
import { TIDE_META_TEXT } from "@/components/tide/tideCardStyles";

export const TIDE_FLYWHEEL_SECTION_CLASS = `mt-8 flex min-w-0 flex-col overflow-hidden ${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT}`;

export const TIDE_FLYWHEEL_CONTENT_CLASS = "min-w-0 p-3 sm:p-4 lg:p-5";

/** Single-line flywheel title — larger than Maiden Voyage hero lines. */
export const TIDE_FLYWHEEL_HEADLINE_SIZE =
  "text-[length:clamp(2.75rem,calc(100cqi/4),7.5rem)]";

export const TIDE_FLYWHEEL_HEADLINE = `${MV_HEADLINE} whitespace-nowrap ${TIDE_FLYWHEEL_HEADLINE_SIZE}`;

export const TIDE_FLYWHEEL_HEADLINE_PRIMARY = "text-white";

export const TIDE_FLYWHEEL_HEADLINE_ACCENT = MV_ACCENT_GRADIENT;

/** Shared white-glass shell for flywheel stat cards and the revenue pill. */
export const TIDE_FLYWHEEL_LIGHT_CARD_SHELL = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

export const TIDE_FLYWHEEL_CARD_BASE = `${TIDE_FLYWHEEL_LIGHT_CARD_SHELL} flex min-w-[220px] max-w-[280px] shrink-0 snap-center flex-col p-3 sm:min-w-[240px] sm:p-4 lg:min-h-0 lg:min-w-0 lg:max-w-none lg:w-full lg:shrink`;

export const TIDE_FLYWHEEL_CARD_ACTIVE =
  "ring-2 ring-[#4A9784]/45 shadow-[0_0_24px_-8px_rgba(74,151,132,0.35)]";

export const TIDE_FLYWHEEL_CARD_INACTIVE = "";

export const TIDE_FLYWHEEL_ICON_BADGE =
  `${HARBOR_FROSTED_LIGHT_ICON_BADGE_BASE} h-9 w-9 text-[#4A9784]`;

export const TIDE_FLYWHEEL_CARD_TITLE =
  "text-sm font-semibold leading-tight text-[#1E4775]";

export const TIDE_FLYWHEEL_CARD_DESC =
  "mt-1.5 text-[11px] leading-snug text-[#1E4775]/65 sm:text-xs";

export const TIDE_FLYWHEEL_STAT_LABEL =
  "text-[10px] font-medium uppercase tracking-wide text-center text-[#1E4775]/55";

export const TIDE_FLYWHEEL_STAT_VALUE =
  "font-mono text-lg font-bold tabular-nums text-[#1E4775] sm:text-xl text-center";

export const TIDE_FLYWHEEL_STAT_SUB =
  "font-mono text-xs tabular-nums text-[#1E4775]/60 text-center";

export const TIDE_FLYWHEEL_ARROW =
  "hidden shrink-0 self-center text-[#1E4775]/25 lg:block lg:px-0.5";

/** Mobile: horizontal scroll. lg+: equal-width grid so cards stay inside the shell. */
export const TIDE_FLYWHEEL_SCROLL_ROW =
  "min-w-0 flex overflow-x-auto pb-1 snap-x snap-mandatory lg:block lg:w-full lg:overflow-hidden lg:pb-0";

export const TIDE_FLYWHEEL_DESKTOP_ROW =
  "flex w-max min-w-full items-stretch gap-2 lg:grid lg:w-full lg:min-w-0 lg:max-w-full lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-0.5";

export const TIDE_FLYWHEEL_REVENUE_PILL = `rounded-xl ${MV_GLASS_INSET_DARK} inline-flex shrink-0 flex-col items-center gap-1 self-center p-3 text-center sm:min-w-[11rem] sm:self-auto sm:p-4`;

export const TIDE_FLYWHEEL_REVENUE_LABEL =
  "text-[10px] font-medium uppercase tracking-wide text-center text-white/55";

export const TIDE_FLYWHEEL_REVENUE_VALUE =
  "font-mono text-lg font-bold tabular-nums text-white/95 sm:text-xl text-center";

export const TIDE_FLYWHEEL_TARGET_BADGE =
  "absolute right-0 top-1/2 max-w-[calc(100%-0.5rem)] -translate-y-1/2 truncate rounded-md bg-[#4A9784] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white";

export const TIDE_FLYWHEEL_INACTIVE_BADGE =
  "rounded-md border border-[#1E4775]/15 bg-[#1E4775]/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50";

export const TIDE_FLYWHEEL_PROGRESS_TRACK =
  "h-2.5 overflow-hidden rounded-full border border-[#1E4775]/15 bg-[#1E4775]/[0.08]";

export const TIDE_FLYWHEEL_CAPTION =
  "text-xs leading-relaxed text-[#1E4775]/50";

export {
  MV_PROGRESS_FILL as TIDE_FLYWHEEL_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE as TIDE_FLYWHEEL_PROGRESS_FILL_COMPLETE,
  MV_FOOTER_PANEL as TIDE_FLYWHEEL_FOOTER_PANEL,
  TIDE_META_TEXT as TIDE_FLYWHEEL_META,
};
