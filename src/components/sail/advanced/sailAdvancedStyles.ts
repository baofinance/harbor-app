import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_GLASS_INSET_LIGHT,
  MV_HEADLINE,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_LIGHT_CARD,
  HARBOR_FROSTED_LIGHT_CARD_ELEVATED,
} from "@/components/shared/harborFrostedSurfaceStyles";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_CANCEL_BUTTON_CLASS,
  DEPOSIT_PRIMARY_DISABLED_CLASS,
  DEPOSIT_PRIMARY_MINT_CLASS,
  DEPOSIT_PRIMARY_NAVY_CLASS,
  DEPOSIT_PRIMARY_RETRY_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import {
  HARBOR_BTN_GLASS_CTA_FULL_CORAL_LIGHT_CLASS,
  HARBOR_BTN_GLASS_CTA_FULL_MINT_CLASS,
  HARBOR_BTN_GLASS_CTA_FULL_NAVY_CLASS,
  HARBOR_BTN_GLASS_MINT_DARK,
  HARBOR_BTN_GLASS_NAVY_DARK,
  HARBOR_BTN_GLASS_OUTLINE_LIGHT,
  HARBOR_BTN_GLASS_SEGMENT_ACTIVE_LIGHT,
} from "@/components/shared/harborButtonStyles";

/** Standalone header metric cards on dark Sail chrome (wallet / this market). */
export const SAIL_ADVANCED_HEADER_STRIP_SHELL = `rounded-xl overflow-hidden h-full ${HARBOR_FROSTED_LIGHT_CARD}`;

export const SAIL_ADVANCED_HEADER_STRIP_DIVIDE =
  "divide-x divide-y divide-[#1E4775]/10";

export const SAIL_ADVANCED_HEADER_STRIP_LABEL =
  "text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/55";

export const SAIL_ADVANCED_HEADER_STRIP_VALUE =
  "mt-1 truncate font-mono text-xs font-semibold tabular-nums text-[#1E4775] sm:text-sm";

/** @deprecated Outer header shell removed — title sits on page chrome. */
export const SAIL_ADVANCED_HEADER_SHELL = `rounded-2xl p-4 sm:p-5 ${HARBOR_FROSTED_LIGHT_CARD}`;

/** @deprecated */
export const SAIL_ADVANCED_HEADER_DIVIDER =
  "h-px w-full bg-gradient-to-r from-transparent via-[#1E4775]/18 to-transparent";

/** Two-column Sail UI+ layout — chart/main left, trade panel right (lg+). */
export const SAIL_ADVANCED_MAIN_GRID_COLUMNS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-stretch";

export const SAIL_ADVANCED_MAIN_GRID_CLASS =
  `${SAIL_ADVANCED_MAIN_GRID_COLUMNS} lg:min-h-[36rem]`;

/** @deprecated Use SAIL_ADVANCED_MAIN_GRID_CLASS */
export const SAIL_ADVANCED_GRID_CLASS = SAIL_ADVANCED_MAIN_GRID_CLASS;

/** Standard white frosted card on Sail UI+ dark chrome. */
export const SAIL_ADVANCED_FROSTED_CARD = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

/** Finer frosted glass — metric cards on dark Sail chrome. */
export const SAIL_ADVANCED_GLASS_CARD = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

/** Whitest frosted panels — chart, trade form, dropdown. */
export const SAIL_ADVANCED_FROSTED_LIGHT_PANEL = HARBOR_FROSTED_LIGHT_CARD;

export const SAIL_ADVANCED_SHELL = MV_CARD_SHELL;
export const SAIL_ADVANCED_LABEL = MV_SECTION_LABEL;
/** Small zone label above header stat groups (Market, Your wallet, etc.). */
export const SAIL_ADVANCED_SECTION_LABEL =
  "mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45";

/** Typography on white frosted cards. */
export const SAIL_ADVANCED_LIGHT_LABEL =
  "text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/55";

export const SAIL_ADVANCED_LIGHT_SECTION_TITLE =
  "text-sm font-semibold leading-snug text-[#1E4775]";

export const SAIL_ADVANCED_LIGHT_CAPTION = "text-xs text-[#1E4775]/75";

export const SAIL_ADVANCED_LIGHT_BODY = "text-sm leading-relaxed text-[#1E4775]/85";

export const SAIL_ADVANCED_LIGHT_VALUE =
  "font-mono text-sm font-semibold tabular-nums text-[#1E4775]";

/** Typography on finer glass metric cards. */
export const SAIL_ADVANCED_GLASS_SECTION_TITLE =
  "text-[10px] font-semibold uppercase tracking-wider text-white/50";

export const SAIL_ADVANCED_GLASS_CAPTION = "text-xs text-white/65";

export const SAIL_ADVANCED_GLASS_VALUE =
  "font-mono text-sm font-semibold tabular-nums text-white/90";

export const SAIL_ADVANCED_BODY = MV_BODY_TEXT;
export const SAIL_ADVANCED_CAPTION = MV_CAPTION_TEXT;
export const SAIL_ADVANCED_META = MV_META_TEXT;
export const SAIL_ADVANCED_HEADLINE = MV_HEADLINE;

/** Embedded mint / redeem form — single white frosted shell. */
export const SAIL_EMBEDDED_FORM_PANEL = `rounded-xl p-3 sm:p-4 text-[#1E4775] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;

/** Trade panel primary actions on frosted light shell. */
export const SAIL_TRADE_BUY_BUTTON_CLASS = HARBOR_BTN_GLASS_CTA_FULL_MINT_CLASS;

export const SAIL_TRADE_SELL_BUTTON_CLASS = HARBOR_BTN_GLASS_CTA_FULL_NAVY_CLASS;

export const SAIL_TRADE_MODAL_PRIMARY_BUTTON_CLASS =
  HARBOR_BTN_GLASS_CTA_FULL_CORAL_LIGHT_CLASS;

export const SAIL_TRADE_CANCEL_BUTTON_CLASS = DEPOSIT_CANCEL_BUTTON_CLASS;

/** Combined amount input card on trade panel. */
export const SAIL_TRADE_AMOUNT_CARD_CLASS = DEPOSIT_AMOUNT_CARD_CLASS;

export const SAIL_TRADE_SECTION_LABEL_CLASS = DEPOSIT_SECTION_LABEL_CLASS;

export const SAIL_TRADE_PRIMARY_BUY_CLASS = DEPOSIT_PRIMARY_MINT_CLASS;

export const SAIL_TRADE_PRIMARY_SELL_CLASS = DEPOSIT_PRIMARY_NAVY_CLASS;

export const SAIL_TRADE_PRIMARY_RETRY_CLASS = DEPOSIT_PRIMARY_RETRY_CLASS;

export const SAIL_TRADE_PRIMARY_DISABLED_CLASS = DEPOSIT_PRIMARY_DISABLED_CLASS;

/** Sticky mobile trade bar — glass on dark chrome. */
export const SAIL_MOBILE_TRADE_BUY_BUTTON_CLASS = `flex-1 rounded-lg px-4 py-2.5 text-sm active:scale-[0.98] ${HARBOR_BTN_GLASS_MINT_DARK}`;

export const SAIL_MOBILE_TRADE_SELL_BUTTON_CLASS = `flex-1 rounded-lg px-4 py-2.5 text-sm active:scale-[0.98] ${HARBOR_BTN_GLASS_NAVY_DARK}`;

/** Chart range / overlay toggles on frosted light chart chrome. */
export const SAIL_CHART_BASELINE_COLOR = "#1F9D6A";
export const SAIL_CHART_HS_COLOR = "#FF8A7A";
/** User-facing label for the leveraged token overlay series (not the hs* symbol). */
export const SAIL_CHART_LEVERAGE_TOKEN_LABEL = "Leveraged token";

/** Series key beside Sail chart (e.g. “BTC per 1 ETH (% chg)”). */
export const SAIL_CHART_LEGEND_CLASS =
  "flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs leading-snug text-[#1E4775]/65 sm:text-[13px]";

export const SAIL_CHART_LEGEND_DOT_CLASS =
  "inline-block h-2.5 w-2.5 shrink-0 rounded-full";

export const SAIL_CHART_RECHARTS_LEGEND_FONT_SIZE = 12;

export const SAIL_CHART_RECHARTS_LEGEND_ICON_SIZE = 9;

export const SAIL_CHART_TOGGLE_IDLE_CLASS =
  "rounded-md border border-[#1E4775]/15 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[#1E4775]/55 transition hover:border-[#1E4775]/25 hover:bg-[#1E4775]/5";

export const SAIL_CHART_TOGGLE_ACTIVE_CLASS = `${HARBOR_BTN_GLASS_SEGMENT_ACTIVE_LIGHT} px-2.5 py-1 text-[11px]`;
