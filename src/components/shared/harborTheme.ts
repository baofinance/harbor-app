/**
 * Harbor light theme — semantic surface + text tokens.
 * Dark mode can map `.dark` overrides later; default is the refreshed light canvas.
 */

/** Page canvas gradient (body). */
export const HARBOR_THEME_CANVAS_CLASS =
  "bg-[#F4F7FB] text-harbor-blue";

/** Primary copy on light canvas. */
export const HARBOR_THEME_TEXT_PRIMARY_CLASS = "text-harbor-blue";

/** Secondary / de-emphasized copy. */
export const HARBOR_THEME_TEXT_SECONDARY_CLASS = "text-harbor-blue/65";

/** Muted labels and captions. */
export const HARBOR_THEME_TEXT_MUTED_CLASS = "text-harbor-blue/45";

/** Standard elevated card on light canvas. */
export const HARBOR_THEME_SURFACE_ELEVATED_CLASS =
  "bg-white border border-harbor-blue/10 shadow-[0_8px_32px_-12px_rgba(30,71,117,0.12)]";

/** Subtle inset / secondary panel. */
export const HARBOR_THEME_SURFACE_MUTED_CLASS =
  "bg-[#F8FAFD] border border-harbor-blue/8";

/** Frosted nav bar on light canvas. */
export const HARBOR_THEME_NAV_SHELL_CLASS =
  "bg-white/80 backdrop-blur-xl border-b border-harbor-blue/10 shadow-[0_1px_0_0_rgba(255,255,255,0.8)]";

/** Footer strip on light canvas. */
export const HARBOR_THEME_FOOTER_CLASS =
  "border-t border-harbor-blue/10 bg-white/60 backdrop-blur-sm";

/** Footer / tertiary links. */
export const HARBOR_THEME_FOOTER_LINK_CLASS =
  "text-harbor-blue/65 hover:bg-harbor-blue/5 hover:text-harbor-blue transition-colors";

/** Card shadow shared by MV / dashboard shells. */
export const HARBOR_THEME_CARD_SHADOW =
  "shadow-[0_8px_32px_-12px_rgba(30,71,117,0.12)]";
