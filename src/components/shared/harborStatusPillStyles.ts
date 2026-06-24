/** Status pill shells for light (white row) and dark (glass inset) surfaces. */

export const HARBOR_STATUS_PILL_BASE =
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold sm:text-xs";

export const HARBOR_STATUS_PILL_ENDED_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-dashed border-harbor-blue/20 bg-harbor-blue/[0.04] text-harbor-blue/50`;

export const HARBOR_STATUS_PILL_ACTIVE_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-mint/40 bg-harbor-mint/15 text-[#2A7A5E]`;

export const HARBOR_STATUS_PILL_NEUTRAL_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-blue/15 bg-harbor-blue/[0.06] text-harbor-blue/65`;

export const HARBOR_STATUS_PILL_WALLET_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-blue/20 bg-harbor-blue/[0.08] text-harbor-blue/70`;

export const HARBOR_STATUS_PILL_STABILITY_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-mint/30 bg-harbor-mint/10 text-[#2A7A5E]/90`;

export const HARBOR_STATUS_PILL_MARKS_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-purple/35 bg-harbor-purple/12 text-[#7C6BB8]`;

export const HARBOR_STATUS_PILL_CORAL_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-coral/40 bg-harbor-coral/15 text-[#D45A4A] ring-1 ring-harbor-coral/20`;

export const HARBOR_STATUS_PILL_GOLD_LIGHT = `${HARBOR_STATUS_PILL_BASE} border border-harbor-gold/35 bg-harbor-gold/12 text-[#B8922E]`;

export const HARBOR_STATUS_PILL_GOLD_DARK = `${HARBOR_STATUS_PILL_BASE} border border-harbor-gold/35 bg-harbor-gold/12 text-harbor-gold`;

export const HARBOR_STATUS_PILL_PURPLE_DARK = `${HARBOR_STATUS_PILL_BASE} border border-harbor-purple/35 bg-harbor-purple/12 text-harbor-purple`;

export const HARBOR_STATUS_PILL_ENDED_GLASS = `${HARBOR_STATUS_PILL_BASE} border border-white/[0.08] bg-[#0a1929]/40 text-white/50`;

export const HARBOR_STATUS_PILL_ACTIVE_GLASS = `${HARBOR_STATUS_PILL_BASE} border border-harbor-mint/35 bg-harbor-mint/15 text-harbor-mint`;

export const HARBOR_STATUS_PILL_NEUTRAL_GLASS = `${HARBOR_STATUS_PILL_BASE} border border-white/[0.09] bg-[#0a1929]/35 text-white/70`;

export const HARBOR_STATUS_PILL_STABILITY_GLASS = `${HARBOR_STATUS_PILL_BASE} border border-harbor-mint/35 bg-harbor-mint/15 text-harbor-mint`;

/** Protocol health badges (light surface — white market cards). */
export const HARBOR_HEALTH_PILL_HEALTHY = HARBOR_STATUS_PILL_ACTIVE_LIGHT;
export const HARBOR_HEALTH_PILL_WARNING = HARBOR_STATUS_PILL_GOLD_LIGHT;
export const HARBOR_HEALTH_PILL_CRITICAL = HARBOR_STATUS_PILL_CORAL_LIGHT;
export const HARBOR_HEALTH_PILL_GENESIS = HARBOR_STATUS_PILL_MARKS_LIGHT;

/** Withdrawal request status badges (light surface). */
export const HARBOR_WITHDRAWAL_PILL_NONE = HARBOR_STATUS_PILL_NEUTRAL_LIGHT;
export const HARBOR_WITHDRAWAL_PILL_WAITING = `${HARBOR_STATUS_PILL_BASE} border border-harbor-blue/25 bg-harbor-blue/10 text-harbor-blue/80`;
export const HARBOR_WITHDRAWAL_PILL_OPEN = HARBOR_STATUS_PILL_STABILITY_LIGHT;
export const HARBOR_WITHDRAWAL_PILL_EXPIRED = HARBOR_STATUS_PILL_CORAL_LIGHT;
