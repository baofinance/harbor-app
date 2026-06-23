import {
  DASHBOARD_PRODUCT_ACCENT_EARN_CLASS,
  DASHBOARD_PRODUCT_ACCENT_MV_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_MV_CLASS,
} from "@/components/dashboard/dashboardStyles";
import {
  MV_CAPTION_TEXT,
  MV_FOOTER_PANEL,
  MV_META_TEXT,
  MV_SECTION_LABEL,
  MV_STAT_TILE,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";

/** Harbor theme accents — aligned with dashboard product cards. */
export const TIDE_THEME = {
  coral: {
    accentBar: DASHBOARD_PRODUCT_ACCENT_MV_CLASS,
    iconBadge: DASHBOARD_PRODUCT_ICON_MV_CLASS,
    subtitle: "text-[#FF8A7A]",
    badgeVariant: "coral" as StatusBadgeVariant,
    highlight: `${MV_STAT_TILE} border-[#FF8A7A]/25`,
    highlightText: "text-[#FF8A7A]",
    inset: MV_STAT_TILE,
    valueAccent: "text-white",
  },
  mint: {
    accentBar: DASHBOARD_PRODUCT_ACCENT_EARN_CLASS,
    iconBadge: DASHBOARD_PRODUCT_ICON_EARN_CLASS,
    subtitle: "text-[#B8EBD5]",
    badgeVariant: "green" as StatusBadgeVariant,
    highlight: `${MV_STAT_TILE} border-[#B8EBD5]/25`,
    highlightText: "text-[#B8EBD5]",
    inset: MV_STAT_TILE,
    valueAccent: "text-[#B8EBD5]",
  },
  blue: {
    accentBar: "bg-[#1E4775]",
    iconBadge:
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#8CB8DC]/25 bg-[#1E4775]/55 text-[#8CB8DC] backdrop-blur-md",
    subtitle: "text-[#8CB8DC]",
    badgeVariant: "neutral" as StatusBadgeVariant,
    highlight: `${MV_STAT_TILE} border-[#1E4775]/40`,
    highlightText: "text-[#8CB8DC]",
    inset: MV_STAT_TILE,
    valueAccent: "text-white",
    button:
      "bg-white text-[#1E4775] enabled:hover:bg-white/90 disabled:opacity-40",
    maxButton: "text-[#8CB8DC]",
  },
} as const;

export {
  MV_META_TEXT as TIDE_META_TEXT,
  MV_SECTION_LABEL as TIDE_LABEL_CLASS,
  MV_CAPTION_TEXT as TIDE_CAPTION_CLASS,
  MV_FOOTER_PANEL as TIDE_CARD_FOOTER,
};

export const TIDE_CARD_BODY = "flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3";

export const TIDE_DISCONNECTED_RING =
  "flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/15 bg-[#122a47]/28 backdrop-blur-sm";

export const TIDE_AMOUNT_CLASS =
  "font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl";

export const TIDE_AMOUNT_SM_CLASS =
  "font-mono text-lg font-semibold tabular-nums text-white sm:text-xl";

export const TIDE_INSET_LABEL_CLASS = `${MV_SECTION_LABEL} text-[10px] uppercase tracking-wide`;

export const TIDE_PRIMARY_BUTTON_CLASS =
  "w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#1E4775] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40";

export const TIDE_INPUT_SHELL_CLASS = `${MV_STAT_TILE} flex items-center gap-2 px-3 py-2`;
