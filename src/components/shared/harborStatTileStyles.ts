import { MV_GLASS_INSET_LIGHT } from "@/components/genesis/maidenVoyageLayoutStyles";

/** Intro tiles under index page titles (Earn, Sail, Genesis extended). */
export const HARBOR_STAT_TILE_INTRO_CLASS =
  "bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative";

export const HARBOR_STAT_TILE_INTRO_ICON_CLASS = "w-5 h-5 shrink-0 text-harbor-coral";

export const HARBOR_STAT_TILE_INTRO_TITLE_CLASS = "font-bold text-white text-base";

export const HARBOR_STAT_TILE_INTRO_BODY_CLASS = "text-xs text-white/80 leading-relaxed";

export const HARBOR_STAT_TILE_INTRO_RING_ACCENT_CLASS = "ring-1 ring-harbor-coral/25";

export const HARBOR_STAT_TILE_INTRO_RING_ACCENT_STRONG_CLASS = "ring-2 ring-harbor-coral/35";

/** Frosted metric chips on dashboard section headers. */
export const HARBOR_STAT_TILE_GLASS_CHIP_SURFACE = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

export const HARBOR_STAT_TILE_GLASS_CHIP_CLASS = `flex h-[4.75rem] w-[9.5rem] shrink-0 flex-col items-center justify-center overflow-hidden px-3 py-2 text-center sm:h-[5rem] sm:w-[10.5rem] ${HARBOR_STAT_TILE_GLASS_CHIP_SURFACE}`;

export const HARBOR_STAT_TILE_GLASS_CHIP_INLINE_CLASS = `flex h-[4.25rem] min-w-0 w-full max-w-full shrink-0 flex-col items-center justify-center overflow-hidden px-2.5 py-2 text-center sm:h-[4.75rem] sm:px-3 md:h-[4rem] md:w-[6.75rem] md:max-w-[7rem] md:shrink-0 md:px-2 lg:h-[4.25rem] lg:w-[7.25rem] lg:max-w-[7.5rem] xl:h-[4.5rem] xl:w-[8rem] xl:max-w-[8.5rem] 2xl:h-[5rem] 2xl:w-[10.5rem] 2xl:max-w-none ${HARBOR_STAT_TILE_GLASS_CHIP_SURFACE}`;

export const HARBOR_STAT_TILE_GLASS_CHIP_LABEL_CLASS =
  "text-xs font-medium tracking-wide text-white/70";

export const HARBOR_STAT_TILE_GLASS_CHIP_VALUE_CLASS =
  "font-mono text-sm tabular-nums font-semibold text-white/90 sm:text-base";

/** Intro stat strip label (Anchor protocol stats). */
export const HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS =
  "text-[11px] text-white/80 uppercase tracking-widest";

export const HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS =
  "text-sm font-semibold text-white font-mono mt-1";
