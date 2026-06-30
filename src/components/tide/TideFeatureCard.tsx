"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/portfolio/StatusBadge";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";
import {
  TIDE_CARD_BODY,
  TIDE_CARD_FOOTER,
  TIDE_DARK_CARD_FOOTER,
  TIDE_DARK_FEATURE_CARD_SHELL,
  TIDE_DARK_FEATURE_CARD_TITLE,
  TIDE_DARK_FOOTER_NOTE_CLASS,
  TIDE_DARK_INSET_LABEL_CLASS,
  TIDE_FEATURE_CARD_SHELL,
  TIDE_FEATURE_CARD_TITLE,
  TIDE_FOOTER_NOTE_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
} from "./tideCardStyles";

export type TideFeatureCardProps = {
  icon: ReactNode;
  iconBadgeClass: string;
  title: string;
  subtitle: string;
  subtitleClass: string;
  badge?: string;
  badgeVariant?: StatusBadgeVariant;
  footer?: string;
  footerExtra?: ReactNode;
  footerExtraClassName?: string;
  variant?: "light" | "dark";
  children: ReactNode;
};

export function TideFeatureCard({
  icon,
  iconBadgeClass,
  title,
  subtitle,
  subtitleClass,
  badge,
  badgeVariant = "neutral",
  footer,
  footerExtra,
  footerExtraClassName,
  variant = "light",
  children,
}: TideFeatureCardProps) {
  const isDark = variant === "dark";
  const shellClass = isDark ? TIDE_DARK_FEATURE_CARD_SHELL : TIDE_FEATURE_CARD_SHELL;
  const titleClass = isDark ? TIDE_DARK_FEATURE_CARD_TITLE : TIDE_FEATURE_CARD_TITLE;
  const subtitleLabelClass = isDark
    ? TIDE_DARK_INSET_LABEL_CLASS
    : TIDE_INSET_LIGHT_LABEL_CLASS;
  const footerClass = isDark ? TIDE_DARK_CARD_FOOTER : TIDE_CARD_FOOTER;
  const footerNoteClass = isDark ? TIDE_DARK_FOOTER_NOTE_CLASS : TIDE_FOOTER_NOTE_CLASS;
  const infoIconClass = isDark ? "text-white/35" : "text-[#1E4775]/40";

  return (
    <article className={shellClass}>
      <header className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={iconBadgeClass} aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className={titleClass}>{title}</h3>
              <p
                className={`${subtitleLabelClass} mt-0.5 normal-case ${subtitleClass}`}
              >
                {subtitle}
              </p>
            </div>
          </div>
          {badge ? (
            <StatusBadge
              label={badge}
              variant={badgeVariant}
              surface={isDark ? "dark" : "light"}
            />
          ) : null}
        </div>
      </header>

      <div className={TIDE_CARD_BODY}>{children}</div>

      {footer || footerExtra ? (
        <footer className={`${footerClass} flex flex-col gap-1`}>
          {footer ? (
            <div className="flex items-center gap-1.5">
              <Info
                className={`h-3.5 w-3.5 shrink-0 ${infoIconClass}`}
                strokeWidth={1.75}
              />
              <span className={footerNoteClass}>{footer}</span>
            </div>
          ) : footerExtra ? (
            <div className="flex items-center gap-1.5">
              <Info
                className={`h-3.5 w-3.5 shrink-0 ${infoIconClass}`}
                strokeWidth={1.75}
              />
              <p className={footerExtraClassName ?? footerNoteClass}>
                {footerExtra}
              </p>
            </div>
          ) : null}
          {footer && footerExtra ? (
            <p className={footerExtraClassName ?? footerNoteClass}>
              {footerExtra}
            </p>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
