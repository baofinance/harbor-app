import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_GLASS_INSET_LIGHT,
  MV_HEADLINE,
  MV_META_TEXT,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  HARBOR_FROSTED_LIGHT_CARD,
  HARBOR_FROSTED_LIGHT_CARD_ELEVATED,
} from "@/components/shared/harborFrostedSurfaceStyles";
import {
  DEPOSIT_EMBEDDED_PANEL_HEIGHT,
  SAIL_TRADE_PANEL_GRID_CLASS,
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
export const SAIL_ADVANCED_HEADER_STRIP_SHELL = `rounded-xl overflow-hidden h-full min-h-[4.25rem] ${HARBOR_FROSTED_LIGHT_CARD}`;

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
export const SAIL_ADVANCED_MAIN_GRID_COLUMNS = SAIL_TRADE_PANEL_GRID_CLASS;

export const SAIL_ADVANCED_MAIN_GRID_CLASS = SAIL_TRADE_PANEL_GRID_CLASS;

/** @deprecated Use SAIL_ADVANCED_MAIN_GRID_CLASS */
export const SAIL_ADVANCED_GRID_CLASS = SAIL_ADVANCED_MAIN_GRID_CLASS;

/** Standard white frosted card on Sail UI+ dark chrome. */
export const SAIL_ADVANCED_FROSTED_CARD = HARBOR_FROSTED_LIGHT_CARD_ELEVATED;

/** Finer frosted glass — metric cards on dark Sail chrome. */
export const SAIL_ADVANCED_GLASS_CARD = `rounded-xl ${MV_GLASS_INSET_LIGHT}`;

/** Whitest frosted panels — chart, trade form, dropdown. */
export const SAIL_ADVANCED_FROSTED_LIGHT_PANEL = HARBOR_FROSTED_LIGHT_CARD;

export const SAIL_ADVANCED_SHELL = MV_CARD_SHELL;

/** Shared token + pair/backing selector row (Earn + Leverage headers). */
export const MARKET_SELECTOR_ROW_CLASS =
  "relative grid w-full max-w-full shrink-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[10.25rem_275px] sm:gap-2";

/** Compact token/peg field — icon + short symbol. */
export const MARKET_SELECTOR_TOKEN_FIELD_CLASS =
  "min-w-0 w-full shrink-0 self-start sm:w-[10.25rem]";

/** Pair/backing field — 275px (was 336px / 21rem). */
export const MARKET_SELECTOR_PAIR_FIELD_CLASS =
  "min-w-0 w-full shrink-0 self-start sm:w-[275px]";

/** Zone label above a selector row or stat strip (Market, Your wallet, …). */
export const MARKET_SELECTOR_ZONE_LABEL_CLASS =
  "mb-1 block pl-0 text-[10px] font-semibold leading-none tracking-wide text-white/55";

/** Field label above each selector column (Sail token, Pair, Backing, …). */
export const MARKET_SELECTOR_FIELD_LABEL_CLASS = `${MARKET_SELECTOR_ZONE_LABEL_CLASS} uppercase`;

/** Icon size inside market selector triggers (token logo, chain icon). */
export const MARKET_SELECTOR_ICON_SIZE = 20;

/** Closed dropdown trigger — fixed height so token/pair columns match. */
export const MARKET_SELECTOR_TRIGGER_CLASS = `flex h-11 w-full min-w-0 items-center gap-2 rounded-xl px-3 text-left transition hover:brightness-[1.02] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;

/** Inner row for trigger content (icon + label). */
export const MARKET_SELECTOR_TRIGGER_INNER_CLASS =
  "flex min-w-0 flex-1 items-center gap-2.5";

/** Trigger primary label — pair/token title text. */
export const MARKET_SELECTOR_TRIGGER_TITLE_CLASS =
  "truncate text-sm font-semibold leading-none text-[#1E4775]";

/** Small zone label above header stat groups — alias for selector zone labels. */
export const SAIL_ADVANCED_SECTION_LABEL = MARKET_SELECTOR_ZONE_LABEL_CLASS;

export const SAIL_ADVANCED_LABEL = MARKET_SELECTOR_ZONE_LABEL_CLASS;

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
/** Horizontal + top padding only — pinned footer owns bottom inset. */
export const SAIL_EMBEDDED_FORM_PANEL = `rounded-xl px-2.5 pt-2.5 pb-0 sm:px-3 sm:pt-3 text-[#1E4775] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;

export { DEPOSIT_EMBEDDED_PANEL_HEIGHT as SAIL_EMBEDDED_PANEL_HEIGHT };

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
