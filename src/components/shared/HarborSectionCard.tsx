"use client";

import type { ComponentType, ReactNode } from "react";
import {
  HARBOR_SECTION_CARD_ACCENT_BAR_CLASS,
  HARBOR_SECTION_CARD_BODY_CLASS,
  HARBOR_SECTION_CARD_HEADER_CLASS,
  HARBOR_SECTION_CARD_HEADER_ROW_CLASS,
  HARBOR_SECTION_CARD_ICON_BADGE_BASE,
  HARBOR_SECTION_CARD_SHELL_CLASS,
  HARBOR_SECTION_CARD_TITLE_CLASS,
} from "./harborSectionCardStyles";

export type HarborSectionCardProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  accentBarClass: string;
  iconBadgeClass?: string;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

export function HarborSectionCard({
  title,
  icon: Icon,
  accentBarClass,
  iconBadgeClass = HARBOR_SECTION_CARD_ICON_BADGE_BASE,
  summary,
  children,
  className = "",
  id,
  ariaLabel,
}: HarborSectionCardProps) {
  return (
    <section
      id={id}
      className={`${HARBOR_SECTION_CARD_SHELL_CLASS} ${className}`.trim()}
      aria-label={ariaLabel ?? title}
    >
      <div
        className={`${HARBOR_SECTION_CARD_ACCENT_BAR_CLASS} ${accentBarClass}`}
        aria-hidden
      />
      <div className={HARBOR_SECTION_CARD_HEADER_CLASS}>
        <div className={HARBOR_SECTION_CARD_HEADER_ROW_CLASS}>
          <span className={`${iconBadgeClass} shrink-0`} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className={HARBOR_SECTION_CARD_TITLE_CLASS}>{title}</h2>
          {summary ? (
            <div className="ml-auto min-w-0 truncate text-xs text-white/70">
              {summary}
            </div>
          ) : null}
        </div>
      </div>
      <div className={HARBOR_SECTION_CARD_BODY_CLASS}>{children}</div>
    </section>
  );
}
