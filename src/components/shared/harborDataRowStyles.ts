/**
 * Shared white data-table chrome for index pages (Earn, Sail, Genesis explorer, Dashboard).
 *
 * Use frosted surfaces on dark page backgrounds.
 * Use `/10` only for inner dividers inside expanded row panels.
 */

import {
  HARBOR_FROSTED_INDEX_SURFACE,
  HARBOR_FROSTED_SURFACE_HOVER,
} from "@/components/shared/harborFrostedSurfaceStyles";

/** Interactive row hover — frosted lift on dark index pages. */
export const HARBOR_DATA_ROW_HOVER_CLASS = HARBOR_FROSTED_SURFACE_HOVER;

/** Frosted table row shell on dark page backgrounds. */
export const HARBOR_DATA_ROW_SHELL_CLASS = `rounded-md overflow-hidden ${HARBOR_FROSTED_INDEX_SURFACE} ${HARBOR_DATA_ROW_HOVER_CLASS}`;

/** Column header band above index-style tables. */
export const HARBOR_TABLE_HEADER_WRAP_CLASS = `${HARBOR_FROSTED_INDEX_SURFACE} py-1.5 px-2 overflow-x-auto mb-0 rounded-md`;

/** Column label typography in table headers. */
export const HARBOR_TABLE_HEADER_LABEL_CLASS =
  "uppercase tracking-wider text-[10px] lg:text-[11px] text-harbor-blue font-semibold";

/** Standard row padding and min height. */
export const HARBOR_ROW_BODY_CLASS = "text-sm py-2.5 px-2 min-h-[52px]";

/** Mobile stacked metric label inside white rows. */
export const HARBOR_MOBILE_METRIC_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-harbor-blue/55";

/** Inline stat label in white index row bars (Earn markets, dashboard positions). */
export const HARBOR_ROW_METRIC_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wide text-harbor-blue/60";

/** Numeric stat in white index row bars — matches Earn market columns. */
export const HARBOR_ROW_METRIC_VALUE_CLASS =
  "font-medium text-xs font-mono tabular-nums text-harbor-blue";

/** Primary value text on white rows. */
export const HARBOR_ROW_VALUE_TEXT_CLASS = "font-medium text-sm text-harbor-blue";

/** Market name in white table rows — matches Earn / Sail / Genesis explorer. */
export const HARBOR_ROW_MARKET_TITLE_CLASS =
  "min-w-0 truncate font-medium text-sm text-harbor-blue lg:text-base";

/** Secondary detail text on white rows. */
export const HARBOR_ROW_DETAIL_TEXT_CLASS = "truncate text-xs leading-snug text-harbor-blue/70";

/** Inner panel divider inside expanded sections (not outer row chrome). */
export const HARBOR_INNER_DIVIDER_CLASS = "border-[#1E4775]/10";
