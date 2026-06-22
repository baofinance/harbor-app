/** Harbor theme accents used on the TIDE dashboard cards. */
export const TIDE_THEME = {
  coral: {
    iconBg: "bg-[#FF8A7A]",
    iconText: "text-white",
    subtitle: "text-[#FF8A7A]",
    badge: "bg-[#FF8A7A]/20 text-[#FF8A7A]",
    highlight: "border-[#FF8A7A]/35 bg-[#FF8A7A]/10",
    highlightText: "text-[#FF8A7A]",
    inset: "border-[#FF8A7A]/20 bg-[#FF8A7A]/5",
  },
  mint: {
    iconBg: "bg-[#B8EBD5]/20",
    iconText: "text-[#B8EBD5]",
    subtitle: "text-[#B8EBD5]",
    badge: "bg-[#B8EBD5]/15 text-[#B8EBD5]",
    highlight: "border-[#B8EBD5]/30 bg-[#B8EBD5]/8",
    highlightText: "text-[#B8EBD5]",
    inset: "border-[#B8EBD5]/20 bg-[#B8EBD5]/5",
  },
  blue: {
    iconBg: "bg-[#1E4775]",
    iconText: "text-white",
    subtitle: "text-[#8CB8DC]",
    badge: "bg-[#1E4775]/50 text-[#8CB8DC]",
    highlight: "border-[#1E4775]/40 bg-[#1E4775]/20",
    highlightText: "text-[#8CB8DC]",
    button:
      "bg-[#1E4775] text-white enabled:hover:bg-[#17395F] disabled:opacity-40",
    maxButton: "text-[#8CB8DC]",
  },
} as const;

export const TIDE_CARD_SHELL =
  "flex flex-col rounded-xl border border-white/10 bg-[#1a1a1a]/90 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/30 min-h-[320px]";

export const TIDE_CARD_HEADER =
  "flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5";

export const TIDE_CARD_BODY =
  "flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-5";

export const TIDE_CARD_FOOTER =
  "flex items-center gap-1.5 border-t border-white/8 px-4 py-2.5 text-[11px] text-white/40 sm:px-5";

export const TIDE_DISCONNECTED_RING =
  "flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/20";

export const TIDE_AMOUNT_CLASS =
  "font-mono text-3xl font-semibold tabular-nums text-white sm:text-4xl";

export const TIDE_AMOUNT_SM_CLASS =
  "font-mono text-xl font-semibold tabular-nums text-white sm:text-2xl";

export const TIDE_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.14em]";
