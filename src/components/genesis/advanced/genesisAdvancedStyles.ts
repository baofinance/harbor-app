/** Shared Earn/Sail chrome tokens for Genesis advanced layout. */
export {
  MARKET_SELECTOR_FIELD_LABEL_CLASS,
  MARKET_SELECTOR_ICON_SIZE,
  MARKET_SELECTOR_PAIR_FIELD_CLASS,
  MARKET_SELECTOR_ROW_CLASS,
  MARKET_SELECTOR_TOKEN_FIELD_CLASS,
  MARKET_SELECTOR_TRIGGER_CLASS,
  MARKET_SELECTOR_TRIGGER_INNER_CLASS,
  MARKET_SELECTOR_TRIGGER_TITLE_CLASS,
  SAIL_ADVANCED_FROSTED_CARD,
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_ADVANCED_SHELL,
  SAIL_EMBEDDED_FORM_PANEL,
} from "@/components/sail/advanced/sailAdvancedStyles";

/** Genesis has no chart column — fixed 500 panel matching voyage card (desktop). */
export const GENESIS_TRADE_PANEL_GRID_CLASS =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-stretch";

/** Horizontal inset only — height is exact 500 on lg+. */
export const GENESIS_EMBEDDED_FORM_PANEL =
  "rounded-xl px-2.5 pb-0 pt-0 sm:px-3 text-[#1E4775]";

export const GENESIS_EMBEDDED_PANEL_HEIGHT =
  "flex min-h-[28rem] flex-col overflow-hidden lg:h-[500px] lg:max-h-[500px] lg:min-h-[500px]";

/** Voyage card column — auto height on mobile, matches trade panel on lg. */
export const GENESIS_VOYAGE_CARD_HEIGHT =
  "min-h-0 lg:h-[500px] lg:max-h-[500px] lg:min-h-[500px]";

/** Stage strip footer on the voyage card. */
export const GENESIS_VOYAGE_CARD_FOOTER_HEIGHT =
  "flex shrink-0 flex-col justify-center py-3 lg:h-[80px] lg:max-h-[80px] lg:min-h-[80px] lg:py-0";

export const GENESIS_TRADE_PANEL_ID = "genesis-trade-panel";
